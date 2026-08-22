import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/** Genera el número de parte del día: YYYYMMDD-NNN (correlativo diario). */
async function generarNumeroParte(): Promise<string> {
    const hoy = new Date()
    const y = hoy.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) // YYYY-MM-DD
    const prefijo = y.replace(/-/g, '')
    const desde = new Date(`${y}T00:00:00+02:00`)
    const hasta = new Date(`${y}T23:59:59+02:00`)
    const n = await prisma.partePAS.count({ where: { createdAt: { gte: desde, lte: hasta } } })
    return `${prefijo}-${String(n + 1).padStart(3, '0')}`
}

/** GET /api/partes/prf — lista paginada con filtros. */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const estado = searchParams.get('estado')
        const q = searchParams.get('q')?.trim()
        const incluirArchivados = searchParams.get('archivados') === 'true'

        const where: any = {}
        if (!incluirArchivados) where.archivado = false
        if (estado && ['borrador', 'completo'].includes(estado)) where.estado = estado
        if (q) {
            where.OR = [
                { numeroParte: { contains: q, mode: 'insensitive' } },
                { numeroInforme: { contains: q, mode: 'insensitive' } },
                { lugar: { contains: q, mode: 'insensitive' } },
                { pacienteNombre: { contains: q, mode: 'insensitive' } },
            ]
        }

        const [partes, total] = await Promise.all([
            prisma.partePAS.findMany({
                where,
                orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.partePAS.count({ where }),
        ])

        return NextResponse.json({ partes, total, page, limit, totalPages: Math.ceil(total / limit) })
    } catch (error) {
        console.error('Error GET /api/partes/prf:', error)
        return NextResponse.json({ error: 'Error obteniendo los partes' }, { status: 500 })
    }
}

/** POST /api/partes/prf — crea un parte (borrador o completo). */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const body = await request.json()
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        const numeroParte = await generarNumeroParte()
        const datos = body.datos && typeof body.datos === 'object' ? body.datos : {}

        const parte = await prisma.partePAS.create({
            data: {
                numeroParte,
                estado: body.estado === 'completo' ? 'completo' : 'borrador',
                // Datos que se muestran en el listado y por los que se busca.
                numeroInforme: datos.numeroInforme ? String(datos.numeroInforme) : null,
                lugar: datos.lugar ? String(datos.lugar) : null,
                motivo: datos.motivo ? String(datos.motivo) : null,
                pacienteNombre: [datos.nombre, datos.apellidos].filter(Boolean).join(' ').trim() || null,
                pacienteDni: datos.dniNie ? String(datos.dniNie) : null,
                traslado: datos.renunciaSinTraslado ? 'renuncia' : (datos.renunciaSinAsistencia ? 'sin asistencia' : null),
                datos,
                lesiones: Array.isArray(body.lesiones) ? body.lesiones : [],
                firmas: body.firmas && typeof body.firmas === 'object' ? body.firmas : undefined,
                creadoPorId: usuarioId ?? 'desconocido',
                creadoPorNombre: usuarioNombre ?? null,
            },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'PartePAS', entidadId: parte.id,
            descripcion: `Parte PAS creado: ${numeroParte}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json({ success: true, parte })
    } catch (error) {
        console.error('Error POST /api/partes/prf:', error)
        return NextResponse.json({ error: 'Error creando el parte' }, { status: 500 })
    }
}
