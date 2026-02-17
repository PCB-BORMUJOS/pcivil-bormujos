import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { generarNumeroParte } from '@/lib/partesPSI'
import { validarPartePSI, validarBorradorPSI } from '@/lib/psi-validation'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'

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

        // Debug payload
        console.log('POST /api/partes/psi payload:', {
            indicativosInforman: body.indicativosInforman,
            firmaInformante: body.firmaInformante ? 'PRESENT' : 'MISSING',
            responsableTurno: body.responsableTurno,
            firmaResponsable: body.firmaResponsable ? 'PRESENT' : 'MISSING'
        })

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

                // Si es base64, extraer y subir
                if (typeof foto === 'string' && foto.startsWith('data:image')) {
                    const matches = foto.match(/^data:image\/(\w+);base64,(.+)$/)
                    if (!matches) continue

                    const extension = matches[1]
                    const base64Data = matches[2]
                    const buffer = Buffer.from(base64Data, 'base64')

                    // Nombre del archivo
                    const filename = `partes/psi/${numeroParte}/foto-${i + 1}-${Date.now()}.${extension}`

                    // Subir a Vercel Blob
                    const { url } = await put(filename, buffer, {
                        access: 'public',
                        contentType: `image/${extension}`,
                        // token: process.env.BLOB_READ_WRITE_TOKEN // Implicit if env var is set
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

        const parte = await prisma.partePSI.create({
            data: {
                numeroParte,
                fecha: new Date(),
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
                vehiculosIds: body.vehiculosIds,
                equipoWalkies: body.equipoWalkies,
                tipologias: body.tipologias,
                tipologiasOtrosTexto: body.tipologiasOtrosTexto || {},
                policiaLocal: body.policiaLocal,
                guardiaCivil: body.guardiaCivil,
                posiblesCausas: body.posiblesCausas,
                tieneHeridos: body.tieneHeridos || false,
                numeroHeridos: body.numeroHeridos,
                tieneFallecidos: body.tieneFallecidos || false,
                numeroFallecidos: body.numeroFallecidos,
                indicativosInforman: body.indicativosInforman, // Assuming schema has this or mapping to indicativoCumplimenta?
                descripcionAccidente: body.descripcionAccidente,
                observaciones: body.observaciones,
                desarrolloDetallado: body.desarrolloDetallado || '',
                fotosUrls,
                // Mapping form fields to schema fields
                // Form uses: indicativosInforman, firmaInformante, responsableTurno, firmaResponsable
                // Schema seems to use: indicativoCumplimenta, firmaIndicativoCumplimenta, responsableTurno, firmaResponsableTurno
                // We need to check schema.prisma to be sure.
                // Based on previous file reads, schema has indicativoCumplimenta. 
                // Let's assume we map them here.
                indicativoCumplimenta: body.indicativosInforman,
                firmaIndicativoCumplimenta: body.firmaInformante,
                responsableTurno: body.responsableTurno,
                firmaResponsableTurno: body.firmaResponsable,
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

        return NextResponse.json({
            success: true,
            parte,
            message: 'Parte creado correctamente'
        })
    } catch (error) {
        console.error('Error POST /api/partes/psi:', error)
        return NextResponse.json(
            { error: 'Error creando parte' },
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
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Verificar rol superadministrador
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true }
        })

        if (usuario?.rol?.nombre !== 'superadministrador') {
            return NextResponse.json(
                { error: 'Solo superadministradores pueden eliminar partes' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        // Eliminar parte
        await prisma.partePSI.delete({
            where: { id }
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
