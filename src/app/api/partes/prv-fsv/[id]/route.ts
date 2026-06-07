import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/**
 * GET /api/partes/prv-fsv/[id]
 * Solo creador o nivel >= 2
 */
export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const parte = await prisma.partePRVFSV.findUnique({ where: { id: params.id } })
        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        const nivel = getNivel((session.user as any).rol ?? '')
        const esCreador = parte.creadoPorId === session.user.id
        if (!esCreador && nivel < 2) {
            return NextResponse.json({ error: 'Sin permisos para ver este parte' }, { status: 403 })
        }

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error obteniendo parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

/**
 * PUT /api/partes/prv-fsv/[id]
 * Solo creador o nivel >= 2 — valida campos requeridos
 */
export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const parteExistente = await prisma.partePRVFSV.findUnique({
            where: { id: params.id },
            select: { id: true, creadoPorId: true },
        })
        if (!parteExistente) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        const nivel = getNivel((session.user as any).rol ?? '')
        const esCreador = parteExistente.creadoPorId === session.user.id
        if (!esCreador && nivel < 2) {
            return NextResponse.json({ error: 'Sin permisos para editar este parte' }, { status: 403 })
        }

        const body = await req.json()

        // Validación básica
        if (body.fecha !== undefined && !body.fecha) {
            return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
        }

        // Determinar estado según firmas presentes
        let estado: string | undefined
        if (body.firmaJefeServicio) {
            estado = 'completo'
        } else if (body.indicativo1 || body.indicativo2 || body.indicativo3) {
            estado = 'pendiente_vb'
        }
        if (body.estado) estado = body.estado

        const updateData: Record<string, unknown> = {}
        if (body.fecha                 !== undefined) updateData.fecha                 = new Date(body.fecha + 'T12:00:00+02:00')
        if (body.hora                  !== undefined) updateData.hora                  = body.hora
        if (body.km                    !== undefined) updateData.km                    = body.km ? parseInt(body.km) : null
        if (body.checklistPrincipal    !== undefined) updateData.checklistPrincipal    = body.checklistPrincipal
        if (body.danosDiagrama         !== undefined) updateData.danosDiagrama         = body.danosDiagrama
        if (body.nivelDiesel           !== undefined) updateData.nivelDiesel           = body.nivelDiesel
        if (body.tieneDiesel           !== undefined) updateData.tieneDiesel           = body.tieneDiesel
        if (body.nivelAceite           !== undefined) updateData.nivelAceite           = body.nivelAceite
        if (body.nivelAgua             !== undefined) updateData.nivelAgua             = body.nivelAgua
        if (body.nivelLimpiaparabrisas !== undefined) updateData.nivelLimpiaparabrisas = body.nivelLimpiaparabrisas
        if (body.observaciones         !== undefined) updateData.observaciones         = body.observaciones
        if (body.indicativo1           !== undefined) updateData.indicativo1           = body.indicativo1
        if (body.indicativo2           !== undefined) updateData.indicativo2           = body.indicativo2
        if (body.indicativo3           !== undefined) updateData.indicativo3           = body.indicativo3
        if (body.firmaJefeServicio     !== undefined) updateData.firmaJefeServicio     = body.firmaJefeServicio
        if (body.checklistMaterial     !== undefined) updateData.checklistMaterial     = body.checklistMaterial
        if (body.fotoFrontal           !== undefined) updateData.fotoFrontal           = body.fotoFrontal
        if (body.fotoTrasera           !== undefined) updateData.fotoTrasera           = body.fotoTrasera
        if (body.fotoLateralIzq        !== undefined) updateData.fotoLateralIzq        = body.fotoLateralIzq
        if (body.fotoLateralDer        !== undefined) updateData.fotoLateralDer        = body.fotoLateralDer
        if (body.fotoDetalle1          !== undefined) updateData.fotoDetalle1          = body.fotoDetalle1
        if (body.fotoDetalle2          !== undefined) updateData.fotoDetalle2          = body.fotoDetalle2
        if (body.fotoDetalle3          !== undefined) updateData.fotoDetalle3          = body.fotoDetalle3
        if (body.fotoDetalle4          !== undefined) updateData.fotoDetalle4          = body.fotoDetalle4
        if (estado                     !== undefined) updateData.estado                = estado

        const parte = await prisma.partePRVFSV.update({
            where: { id: params.id },
            data: updateData,
        })

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error actualizando parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

/**
 * DELETE /api/partes/prv-fsv/[id]
 * Solo nivel >= 2
 */
export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const nivel = getNivel((session.user as any).rol ?? '')
        if (nivel < 2) {
            return NextResponse.json({ error: 'Sin permisos para eliminar partes' }, { status: 403 })
        }

        const parteExist = await prisma.partePRVFSV.findUnique({ where: { id: params.id } })

        await prisma.partePRVFSV.delete({ where: { id: params.id } })

        if (parteExist) {
            const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
            await registrarAudit({
                accion: 'DELETE',
                entidad: 'PartePRVFSV',
                entidadId: params.id,
                descripcion: `Parte PRV-FSV eliminado: ${parteExist.numeroReferencia}`,
                usuarioId,
                usuarioNombre,
                modulo: 'Partes',
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error eliminando parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
