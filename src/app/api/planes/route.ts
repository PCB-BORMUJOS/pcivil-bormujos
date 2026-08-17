import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/** Consultar: cualquier voluntario. Crear, editar o borrar: coordinador o superior. */
function puedeEditar(session: any): boolean {
    return getNivel((session?.user as any)?.rol ?? '') >= 4
}

const TIPOS_VALIDOS = ['ptel', 'edificio', 'evento']

/** Convierte 'YYYY-MM-DD' a Date, o null. Evita fechas inválidas en la BD. */
function fechaONull(v: unknown): Date | null {
    if (!v || typeof v !== 'string' || v.trim() === '') return null
    const d = new Date(`${v.slice(0, 10)}T12:00:00+02:00`)
    return isNaN(d.getTime()) ? null : d
}

function numeroONull(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

function textoONull(v: unknown): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t === '' ? null : t
}

/**
 * GET /api/planes?tipo=edificio&q=colegio
 * Lista de planes con sus documentos.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')
        const q = searchParams.get('q')?.trim()

        const where: any = { activo: true }
        if (tipo && TIPOS_VALIDOS.includes(tipo)) where.tipo = tipo
        if (q) {
            where.OR = [
                { nombre: { contains: q, mode: 'insensitive' } },
                { descripcion: { contains: q, mode: 'insensitive' } },
                { direccion: { contains: q, mode: 'insensitive' } },
                { responsableNombre: { contains: q, mode: 'insensitive' } },
                { referencia: { contains: q, mode: 'insensitive' } },
            ]
        }

        const planes = await prisma.plan.findMany({
            where,
            include: {
                documentos: { orderBy: { createdAt: 'desc' } },
                _count: { select: { documentos: true } },
            },
            orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
        })

        return NextResponse.json({ planes })
    } catch (error) {
        console.error('Error GET /api/planes:', error)
        return NextResponse.json({ error: 'Error obteniendo los planes' }, { status: 500 })
    }
}

/**
 * POST /api/planes — crea un plan.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden crear planes' }, { status: 403 })
        }

        const body = await request.json()
        if (!body.nombre || String(body.nombre).trim() === '') {
            return NextResponse.json({ error: 'El nombre del plan es obligatorio' }, { status: 400 })
        }
        if (!TIPOS_VALIDOS.includes(body.tipo)) {
            return NextResponse.json({ error: 'Tipo de plan no válido' }, { status: 400 })
        }

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        const plan = await prisma.plan.create({
            data: {
                tipo: body.tipo,
                nombre: String(body.nombre).trim(),
                descripcion: textoONull(body.descripcion),
                referencia: textoONull(body.referencia),
                direccion: textoONull(body.direccion),
                latitud: numeroONull(body.latitud),
                longitud: numeroONull(body.longitud),
                fechaAprobacion: fechaONull(body.fechaAprobacion),
                fechaRevision: fechaONull(body.fechaRevision),
                organoAprobacion: textoONull(body.organoAprobacion),
                responsableNombre: textoONull(body.responsableNombre),
                responsableCargo: textoONull(body.responsableCargo),
                responsableTelefono: textoONull(body.responsableTelefono),
                responsableEmail: textoONull(body.responsableEmail),
                aforo: numeroONull(body.aforo),
                ocupacion: textoONull(body.ocupacion),
                nivelRiesgo: textoONull(body.nivelRiesgo),
                mediosPropios: textoONull(body.mediosPropios),
                observaciones: textoONull(body.observaciones),
                creadoPorId: usuarioId ?? null,
            },
            include: { documentos: true, _count: { select: { documentos: true } } },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'Plan', entidadId: plan.id,
            descripcion: `Plan creado: ${plan.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
            datosNuevos: { tipo: plan.tipo, nombre: plan.nombre },
        })

        return NextResponse.json({ success: true, plan })
    } catch (error) {
        console.error('Error POST /api/planes:', error)
        return NextResponse.json({ error: 'Error creando el plan' }, { status: 500 })
    }
}
