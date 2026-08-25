import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generarNumeroParte } from '@/lib/partesPSI'
import { validarPartePSI, validarBorradorPSI } from '@/lib/psi-validation'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { parseFechaES } from '@/lib/date-utils'

/**
 * GET /api/partes/psi
 * Lista partes con paginación y filtros
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const fecha = searchParams.get('fecha')
        const estado = searchParams.get('estado')
        const incluirArchivados = searchParams.get('archivados') === 'true'
        const numeroVoluntario = searchParams.get('numeroVoluntario')

        // Construir filtros
        const where: any = {}

        if (!incluirArchivados) {
            where.archivado = false
        }

        if (fecha) {
            const fechaInicio = new Date(fecha)
            fechaInicio.setHours(0, 0, 0, 0)
            const fechaFin = new Date(fecha)
            fechaFin.setHours(23, 59, 59, 999)
            where.fecha = { gte: fechaInicio, lte: fechaFin }
        }

        if (estado && (estado === 'pendiente_vb' || estado === 'completo' || estado === 'borrador')) {
            where.estado = estado
        }

        if (numeroVoluntario) {
            where.creadoPor = {
                numeroVoluntario
            }
        }

        // Ejecutar consultas en paralelo
        const [partes, total] = await Promise.all([
            prisma.partePSI.findMany({
                where,
                include: {
                    creadoPor: {
                        select: {
                            id: true,
                            nombre: true,
                            apellidos: true,
                            numeroVoluntario: true
                        }
                    }
                },
                orderBy: [
                    { fecha: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.partePSI.count({ where })
        ])

        // Calcular paginación
        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            partes,
            total,
            page,
            limit,
            totalPages
        })
    } catch (error) {
        console.error('Error GET /api/partes/psi:', error)
        return NextResponse.json(
            { error: 'Error obteniendo partes' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/partes/psi
 * Crea un nuevo parte PSI
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {

            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()



        // Validar campos obligatorios (dos niveles: borrador vs finalización)
        const esBorrador = !body.finalizar
        const validacion = esBorrador ? validarBorradorPSI(body) : validarPartePSI(body)
        if (!validacion.valido) {
            return NextResponse.json(
                { error: 'Validación fallida', errores: validacion.errores },
                { status: 400 }
            )
        }

        // Generar número de parte automático
        const numeroParte = await generarNumeroParte()

        // Procesar y subir fotografías a Vercel Blob
        const fotosUrls: string[] = []
        if (body.fotos && Array.isArray(body.fotos)) {
            for (let i = 0; i < Math.min(body.fotos.length, 3); i++) {
                const foto = body.fotos[i]

                // Si ya es una URL (foto subida y comprimida aparte), se conserva.
                if (typeof foto === 'string' && /^https?:\/\//.test(foto)) {
                    fotosUrls.push(foto)
                    continue
                }
                // Si es base64: comprimir/optimizar con sharp antes de subir.
                if (typeof foto === 'string' && foto.startsWith('data:image')) {
                    const matches = foto.match(/^data:image\/(\w+);base64,(.+)$/)
                    if (!matches) continue

                    const buffer = Buffer.from(matches[2], 'base64')
                    const comprimido = await sharp(buffer)
                        .rotate()
                        .resize({ width: 1600, withoutEnlargement: true })
                        .jpeg({ quality: 80, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
                        .toBuffer()

                    const filename = `partes/psi/${numeroParte}/foto-${i + 1}-${Date.now()}.jpg`
                    const { url } = await put(filename, comprimido, {
                        access: 'public',
                        contentType: 'image/jpeg',
                    })

                    fotosUrls.push(url)
                }
            }
        }

        // Determinar estado del parte:
        // - 'borrador' si no tiene firmas ni campos críticos
        // - 'pendiente_vb' si tiene firmas pero falta VB del jefe
        // - 'completo' si tiene firma del jefe de servicio
        let estado = 'borrador'
        if (body.firmaJefeServicio) {
            estado = 'completo'
        } else if (body.firmaInformante || body.firmaIndicativoCumplimenta || body.firmaResponsable || body.firmaResponsableTurno) {
            estado = 'pendiente_vb'
        }

        // Crear parte en base de datos
        // Use user ID from session. Assuming session.user.id exists.
        // If not, we might need to fetch user by email.
        let userId = session.user.id
        if (!userId && session.user.email) {
            const user = await prisma.usuario.findUnique({ where: { email: session.user.email } })
            if (user) userId = user.id
        }

        if (!userId) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
        }

        const crearParte = (num: string) => prisma.partePSI.create({
            data: {
                numeroParte: num,
                fecha: parseFechaES(body.fecha),
                estado,
                horaLlamada: body.horaLlamada,
                horaSalida: body.horaSalida,
                horaLlegada: body.horaLlegada,
                horaTerminado: body.horaTerminado,
                horaDisponible: body.horaDisponible,
                lugar: body.lugar,
                motivo: body.motivo,
                alertante: body.alertante,
                circulacion: body.circulacion,
                matriculasImplicados: body.matriculasImplicados,
                vehiculosIds: body.vehiculosIds || [],
                equipoWalkies: body.equipoWalkies || [],
                tipologias: body.tipologias || [],
                tipologiasOtrosTexto: body.tipologiasOtrosTexto || {},
                policiaLocal: body.policiaLocal,
                guardiaCivil: body.guardiaCivil,
                posiblesCausas: body.posiblesCausas,
                tieneHeridos: body.tieneHeridos || false,
                numeroHeridos: body.numeroHeridos,
                tieneFallecidos: body.tieneFallecidos || false,
                numeroFallecidos: body.numeroFallecidos,
                indicativosInforman: body.indicativosInforman,
                descripcionAccidente: body.descripcionAccidente,
                observaciones: body.observaciones || '',
                desarrolloDetallado: body.desarrolloDetallado || '',
                fotosUrls,
                informacionExtra: body.informacionExtra ?? null,
                indicativoCumplimenta: body.indicativoCumplimenta || body.indicativosInforman,
                firmaIndicativoCumplimenta: body.firmaIndicativoCumplimenta || body.firmaInformante || null,
                responsableTurno: body.responsableTurno,
                firmaResponsableTurno: body.firmaResponsableTurno || body.firmaResponsable || null,
                firmaJefeServicio: body.firmaJefeServicio || null,
                tipoFirmaJefe: body.tipoFirmaJefe || null,
                creadoPorId: userId
            },
            include: {
                creadoPor: {
                    select: { nombre: true, apellidos: true, numeroVoluntario: true }
                }
            }
          })

        // Reintento ante colisión del número (@unique): si dos partes se crean casi
        // a la vez y obtienen el mismo número, se regenera y se reintenta.
        let numero = numeroParte
        let parte: Awaited<ReturnType<typeof crearParte>> | null = null
        for (let intento = 0; intento < 4 && !parte; intento++) {
            try { parte = await crearParte(numero) }
            catch (e: any) {
                if (e?.code === 'P2002' && intento < 3) { numero = await generarNumeroParte(); continue }
                throw e
            }
        }
        if (!parte) throw new Error('No se pudo asignar número de parte')

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'CREATE',
            entidad: 'PartePSI',
            entidadId: parte.id,
            descripcion: 'Parte PSI creado: ' + parte.numeroParte,
            usuarioId,
            usuarioNombre,
            modulo: 'Partes',
            datosNuevos: { numeroParte: parte.numeroParte, lugar: parte.lugar },
        })

        return NextResponse.json({
            success: true,
            parte,
            message: 'Parte creado correctamente'
        })
    } catch (error) {
        console.error('Error POST /api/partes/psi:', error)
        return NextResponse.json(
            { error: 'Error creando parte', detalle: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/partes/psi?id=xxx
 * Elimina un parte (solo superadministradores)
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const rol = (session.user as any).rol ?? ''
        const nivelRol: Record<string, number> = { superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 }
        if ((nivelRol[rol] ?? 1) < 5) {
            return NextResponse.json(
                { error: 'Solo el Jefe del Servicio puede eliminar partes' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        const parteExistente = await prisma.partePSI.findUnique({
            where: { id }
        })

        if (!parteExistente) {
             return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        // Eliminar parte
        await prisma.partePSI.delete({
            where: { id }
        })

        const { usuarioId: adminId, usuarioNombre: adminNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE',
            entidad: 'PartePSI',
            entidadId: id,
            descripcion: `Parte PSI eliminado: ${parteExistente.numeroParte}`,
            usuarioId: adminId,
            usuarioNombre: adminNombre,
            modulo: 'Partes'
        })

        return NextResponse.json({
            success: true,
            message: 'Parte eliminado correctamente'
        })
    } catch (error) {
        console.error('Error DELETE /api/partes/psi:', error)
        return NextResponse.json(
            { error: 'Error eliminando parte' },
            { status: 500 }
        )
    }
}
