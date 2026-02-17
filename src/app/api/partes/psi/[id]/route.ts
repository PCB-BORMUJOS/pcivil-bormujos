import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const parte = await prisma.partePSI.findUnique({
            where: { id: params.id },
            include: {
                creadoPor: {
                    select: { nombre: true, apellidos: true, numeroVoluntario: true }
                }
            }
        })

        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error obteniendo parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await req.json()

        // Determinar estado
        let estado: string | undefined = undefined
        if (body.estado) {
            estado = body.estado
        }
        if (body.firmaJefeServicio) {
            estado = 'completo'
        } else if (body.firmaIndicativoCumplimenta || body.firmaResponsableTurno) {
            estado = 'pendiente_vb'
        }

        // Map only known Prisma fields (same mapping as POST route)
        const updateData: Record<string, unknown> = {}

        // Only include fields that are present in the payload
        if (body.fecha !== undefined) updateData.fecha = new Date(body.fecha)
        if (estado !== undefined) updateData.estado = estado
        if (body.horaLlamada !== undefined) updateData.horaLlamada = body.horaLlamada
        if (body.horaSalida !== undefined) updateData.horaSalida = body.horaSalida
        if (body.horaLlegada !== undefined) updateData.horaLlegada = body.horaLlegada
        if (body.horaTerminado !== undefined) updateData.horaTerminado = body.horaTerminado
        if (body.horaDisponible !== undefined) updateData.horaDisponible = body.horaDisponible
        if (body.lugar !== undefined) updateData.lugar = body.lugar
        if (body.motivo !== undefined) updateData.motivo = body.motivo
        if (body.alertante !== undefined) updateData.alertante = body.alertante
        if (body.circulacion !== undefined) updateData.circulacion = body.circulacion
        if (body.matriculasImplicados !== undefined) updateData.matriculasImplicados = body.matriculasImplicados
        if (body.vehiculosIds !== undefined) updateData.vehiculosIds = body.vehiculosIds
        if (body.equipoWalkies !== undefined) updateData.equipoWalkies = body.equipoWalkies
        if (body.tipologias !== undefined) updateData.tipologias = body.tipologias
        if (body.tipologiasOtrosTexto !== undefined) updateData.tipologiasOtrosTexto = body.tipologiasOtrosTexto
        if (body.policiaLocal !== undefined) updateData.policiaLocal = body.policiaLocal
        if (body.guardiaCivil !== undefined) updateData.guardiaCivil = body.guardiaCivil
        if (body.posiblesCausas !== undefined) updateData.posiblesCausas = body.posiblesCausas
        if (body.tieneHeridos !== undefined) updateData.tieneHeridos = body.tieneHeridos
        if (body.numeroHeridos !== undefined) updateData.numeroHeridos = body.numeroHeridos
        if (body.tieneFallecidos !== undefined) updateData.tieneFallecidos = body.tieneFallecidos
        if (body.numeroFallecidos !== undefined) updateData.numeroFallecidos = body.numeroFallecidos
        if (body.indicativosInforman !== undefined) updateData.indicativosInforman = body.indicativosInforman
        if (body.descripcionAccidente !== undefined) updateData.descripcionAccidente = body.descripcionAccidente
        if (body.observaciones !== undefined) updateData.observaciones = body.observaciones
        if (body.desarrolloDetallado !== undefined) updateData.desarrolloDetallado = body.desarrolloDetallado
        if (body.indicativoCumplimenta !== undefined) updateData.indicativoCumplimenta = body.indicativoCumplimenta
        if (body.firmaIndicativoCumplimenta !== undefined) updateData.firmaIndicativoCumplimenta = body.firmaIndicativoCumplimenta
        if (body.responsableTurno !== undefined) updateData.responsableTurno = body.responsableTurno
        if (body.firmaResponsableTurno !== undefined) updateData.firmaResponsableTurno = body.firmaResponsableTurno
        if (body.firmaJefeServicio !== undefined) updateData.firmaJefeServicio = body.firmaJefeServicio
        if (body.tipoFirmaJefe !== undefined) updateData.tipoFirmaJefe = body.tipoFirmaJefe

        // PDF and Drive fields
        if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl
        if (body.pdfGenerado !== undefined) updateData.pdfGenerado = body.pdfGenerado
        if (body.googleDriveId !== undefined) updateData.googleDriveId = body.googleDriveId
        if (body.googleDriveUrl !== undefined) updateData.googleDriveUrl = body.googleDriveUrl

        const parte = await prisma.partePSI.update({
            where: { id: params.id },
            data: updateData,
            include: {
                creadoPor: {
                    select: { nombre: true, apellidos: true, numeroVoluntario: true }
                }
            }
        })

        return NextResponse.json({ success: true, parte, message: 'Parte actualizado correctamente' })
    } catch (error) {
        console.error('Error actualizando parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Opcional: Validar permisos extras para borrar

        await prisma.partePSI.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error eliminando parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
