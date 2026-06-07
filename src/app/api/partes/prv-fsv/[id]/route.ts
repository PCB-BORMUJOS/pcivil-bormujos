import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const parte = await prisma.partePRVFSV.findUnique({ where: { id: params.id } })
        if (!parte) return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })

        const nivel = getNivel((session.user as any).rol ?? '')
        const esCreador = parte.creadoPorId === session.user.id
        if (!esCreador && nivel < 2) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
        }

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error obteniendo parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const parteExistente = await prisma.partePRVFSV.findUnique({
            where: { id: params.id },
            select: { id: true, creadoPorId: true },
        })
        if (!parteExistente) return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })

        const nivel = getNivel((session.user as any).rol ?? '')
        const esCreador = parteExistente.creadoPorId === session.user.id
        if (!esCreador && nivel < 2) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
        }

        const body = await req.json()
        if (body.fecha !== undefined && !body.fecha) {
            return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
        }

        const updateData: Record<string, unknown> = {}
        if (body.fecha             !== undefined) updateData.fecha             = new Date(body.fecha + 'T12:00:00+02:00')
        if (body.hora              !== undefined) updateData.hora              = body.hora
        if (body.km                !== undefined) updateData.km                = body.km ? parseInt(body.km) : null
        if (body.camposFormulario  !== undefined) updateData.camposFormulario  = body.camposFormulario
        if (body.fotoFrontal       !== undefined) updateData.fotoFrontal       = body.fotoFrontal
        if (body.fotoTrasera       !== undefined) updateData.fotoTrasera       = body.fotoTrasera
        if (body.fotoLateralIzq    !== undefined) updateData.fotoLateralIzq    = body.fotoLateralIzq
        if (body.fotoLateralDer    !== undefined) updateData.fotoLateralDer    = body.fotoLateralDer
        if (body.estado            !== undefined) updateData.estado            = body.estado

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

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const nivel = getNivel((session.user as any).rol ?? '')
        if (nivel < 2) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

        const parteExist = await prisma.partePRVFSV.findUnique({ where: { id: params.id } })
        await prisma.partePRVFSV.delete({ where: { id: params.id } })

        if (parteExist) {
            const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
            await registrarAudit({
                accion: 'DELETE', entidad: 'PartePRVFSV', entidadId: params.id,
                descripcion: `Parte PRV-FSV eliminado: ${parteExist.numeroReferencia}`,
                usuarioId, usuarioNombre, modulo: 'Partes',
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error eliminando parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
