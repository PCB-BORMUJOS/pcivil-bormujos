import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { getTodaySpain } from '@/lib/date-utils'

async function generarNumeroReferencia(): Promise<string> {
    const year = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 4)
    const prefix = `PRV-FSV-${year}-`
    const ultimo = await prisma.partePRVFSV.findFirst({
        where: { numeroReferencia: { startsWith: prefix } },
        orderBy: { numeroReferencia: 'desc' },
        select: { numeroReferencia: true },
    })
    const siguiente = ultimo ? parseInt(ultimo.numeroReferencia.slice(prefix.length), 10) + 1 : 1
    return `${prefix}${String(siguiente).padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const page  = parseInt(searchParams.get('page')  || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const fecha  = searchParams.get('fecha')
        const estado = searchParams.get('estado')

        const nivel = getNivel((session.user as any).rol ?? '')
        const where: Record<string, unknown> = {}
        if (nivel < 2) where.creadoPorId = session.user.id
        if (fecha)  where.fecha  = new Date(fecha + 'T12:00:00+02:00')
        if (estado) where.estado = estado

        const [partes, total] = await Promise.all([
            prisma.partePRVFSV.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true, numeroReferencia: true, fecha: true,
                    hora: true, km: true, estado: true, createdAt: true,
                    creadoPor: { select: { nombre: true, apellidos: true } },
                },
            }),
            prisma.partePRVFSV.count({ where }),
        ])

        return NextResponse.json({ partes, total, page, limit })
    } catch (error) {
        console.error('Error listando partes PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const body = await request.json()
        const numeroReferencia = await generarNumeroReferencia()
        const fechaStr = body.fecha || getTodaySpain()
        const fecha = new Date(fechaStr + 'T12:00:00+02:00')

        const parte = await prisma.partePRVFSV.create({
            data: {
                numeroReferencia,
                fecha,
                hora:             body.hora             ?? '',
                km:               body.km               ? parseInt(body.km) : null,
                camposFormulario: body.camposFormulario  ?? {},
                fotoFrontal:      body.fotoFrontal       ?? null,
                fotoTrasera:      body.fotoTrasera       ?? null,
                fotoLateralIzq:   body.fotoLateralIzq    ?? null,
                fotoLateralDer:   body.fotoLateralDer    ?? null,
                estado:           'borrador',
                creadoPorId:      session.user.id,
            },
        })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'CREATE', entidad: 'PartePRVFSV', entidadId: parte.id,
            descripcion: `Parte PRV-FSV creado: ${numeroReferencia}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json(parte, { status: 201 })
    } catch (error) {
        console.error('Error creando parte PRV-FSV:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
