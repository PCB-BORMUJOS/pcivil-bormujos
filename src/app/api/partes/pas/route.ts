import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/** Genera el número de parte del día: YYYYMMDD-NNN (correlativo diario). */
/**
 * Número de parte del día, en hora de Madrid.
 *
 * Se numera a partir del MAYOR sufijo existente, no del recuento: contando,
 * cualquier hueco —un parte borrado— repite un número ya usado y choca con la
 * restricción de unicidad. Es el mismo problema que dio el PSI.
 *
 * La fecha que manda es la real: una asistencia a la 01:00 del día 29 lleva
 * prefijo del 29, aunque el turno de noche empezara el 28.
 */
async function generarNumeroParte(): Promise<string> {
    const dia = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const prefijo = dia.replace(/-/g, '')
    const ultimo = await prisma.partePAS.findFirst({
        where: { numeroParte: { startsWith: `${prefijo}-` } },
        orderBy: { numeroParte: 'desc' },
        select: { numeroParte: true },
    })
    const previo = ultimo ? parseInt(ultimo.numeroParte.split('-')[1] || '0', 10) : 0
    return `${prefijo}-${String(previo + 1).padStart(3, '0')}`
}

/**
 * Momento real de la asistencia.
 *
 * Lo que vale es cuándo se atendió, no a qué jornada de servicio pertenece: a
 * la 01:00 del día 29 la fecha del parte es el 29, aunque el turno arrancara la
 * tarde del 28. Si el formulario trae fecha y hora, mandan esas; si no, ahora.
 */
function momentoAsistencia(datos: any): Date {
    const f = typeof datos?.fecha === 'string' ? datos.fecha.trim() : ''
    const h = typeof datos?.hora === 'string' ? datos.hora.trim() : ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        const hora = /^\d{2}:\d{2}$/.test(h) ? h : '12:00'
        const d = new Date(`${f}T${hora}:00`)
        if (!isNaN(d.getTime())) return d
    }
    return new Date()
}

/** GET /api/partes/prf — lista paginada con filtros. */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })


        const { searchParams } = new URL(request.url)
        // Un parte que aún no se ha guardado no tiene número: el servidor lo
        // asigna al crearlo. Con ?siguiente=1 se consulta cuál tocaría, para
        // poder enseñarlo en el formulario desde el primer momento. Es
        // orientativo: el definitivo se asigna al guardar, por si entretanto
        // otra persona crea un parte.
        if (searchParams.get('siguiente') === '1') {
            return NextResponse.json({ numeroParte: await generarNumeroParte() })
        }
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
                fecha: momentoAsistencia(datos),
                estado: body.estado === 'completo' ? 'completo' : 'borrador',
                // Datos que se muestran en el listado y por los que se busca.
                // El nº de informe es el mismo número del parte: no se le da otro
                // formato. Solo se respeta si viene escrito a mano.
                numeroInforme: datos.numeroInforme ? String(datos.numeroInforme) : numeroParte,
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
