import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { componerExpediente } from '@/lib/casetas-feria'

/** Genera el número de parte del día: YYYYMMDD-NNN (correlativo diario). */
async function generarNumeroParte(): Promise<string> {
    const hoy = new Date()
    const y = hoy.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) // YYYY-MM-DD
    const prefijo = y.replace(/-/g, '')
    const desde = new Date(`${y}T00:00:00+02:00`)
    const hasta = new Date(`${y}T23:59:59+02:00`)
    const n = await prisma.partePRF.count({ where: { createdAt: { gte: desde, lte: hasta } } })
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
                { expediente: { contains: q, mode: 'insensitive' } },
                { nombreCaseta: { contains: q, mode: 'insensitive' } },
                { numeroCaseta: { contains: q, mode: 'insensitive' } },
            ]
        }

        const [partes, total] = await Promise.all([
            prisma.partePRF.findMany({
                where,
                orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.partePRF.count({ where }),
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

        const parte = await prisma.partePRF.create({
            data: {
                numeroParte,
                estado: body.estado === 'completo' ? 'completo' : 'borrador',
                // El expediente se compone aquí, no en el navegador: el número de
                // parte se genera en este mismo punto, así que al crear el parte el
                // cliente todavía no lo conoce y guardaría solo el ID de la caseta.
                expediente: componerExpediente(numeroParte, datos.numeroCaseta) || null,
                nombreCaseta: datos.nombreCaseta ? String(datos.nombreCaseta) : null,
                numeroCaseta: datos.numeroCaseta ? String(datos.numeroCaseta) : null,
                resultado: datos.resultado ? String(datos.resultado) : null,
                datos,
                fotosUrls: body.fotosUrls && typeof body.fotosUrls === 'object' ? body.fotosUrls : {},
                firmas: body.firmas && typeof body.firmas === 'object' ? body.firmas : undefined,
                creadoPorId: usuarioId ?? 'desconocido',
                creadoPorNombre: usuarioNombre ?? null,
            },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'PartePRF', entidadId: parte.id,
            descripcion: `Parte PRF creado: ${numeroParte}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json({ success: true, parte })
    } catch (error) {
        console.error('Error POST /api/partes/prf:', error)
        return NextResponse.json({ error: 'Error creando el parte' }, { status: 500 })
    }
}
