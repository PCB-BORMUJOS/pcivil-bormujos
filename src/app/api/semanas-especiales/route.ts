import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import {
    DIAS_SEMANA,
    construirConfigSemana,
    configSemanaHabitual,
    normalizarTurnosPorDia,
} from '@/lib/turnos'

const FORMATO_SEMANA = /^\d{4}-\d{2}-\d{2}$/

/** Solo coordinador (4) o superior puede tocar el dispositivo de una semana. */
function puedeGestionar(session: any): boolean {
    return getNivel((session?.user as any)?.rol ?? '') >= 4
}

/**
 * GET /api/semanas-especiales            → lista de semanas especiales
 * GET /api/semanas-especiales?semana=... → configuración de esa semana
 *
 * La lectura está abierta a cualquier usuario autenticado: el voluntario
 * necesita saber qué franjas se le piden al enviar su disponibilidad.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const semana = new URL(request.url).searchParams.get('semana')

        if (semana) {
            if (!FORMATO_SEMANA.test(semana)) {
                return NextResponse.json({ error: 'Formato de semana inválido (YYYY-MM-DD)' }, { status: 400 })
            }
            const fila = await prisma.semanaEspecial.findUnique({ where: { semana } })
            return NextResponse.json({ semana, config: construirConfigSemana(fila) })
        }

        const filas = await prisma.semanaEspecial.findMany({ orderBy: { semana: 'desc' } })
        return NextResponse.json({
            semanas: filas.map(f => ({
                id: f.id,
                semana: f.semana,
                nombre: f.nombre,
                activa: f.activa,
                config: construirConfigSemana(f),
            })),
        })
    } catch (error) {
        console.error('Error GET /api/semanas-especiales:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

/**
 * POST /api/semanas-especiales
 * Body: { semana: 'YYYY-MM-DD', nombre: string, turnosPorDia: { lunes: [...], ... } }
 * Crea o actualiza el dispositivo de una semana.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        if (!puedeGestionar(session)) {
            return NextResponse.json({ error: 'Sin permisos para configurar semanas especiales' }, { status: 403 })
        }

        const body = await request.json()
        const { semana, nombre, turnosPorDia } = body

        if (!semana || !FORMATO_SEMANA.test(String(semana))) {
            return NextResponse.json({ error: 'Semana requerida en formato YYYY-MM-DD' }, { status: 400 })
        }
        // La semana se identifica por su lunes; aceptar otro día descuadraría las lecturas
        if (new Date(`${semana}T12:00:00`).getDay() !== 1) {
            return NextResponse.json({ error: 'La semana debe indicarse con la fecha del lunes' }, { status: 400 })
        }
        if (!nombre || String(nombre).trim() === '') {
            return NextResponse.json({ error: 'El nombre del dispositivo es obligatorio' }, { status: 400 })
        }

        // Se normaliza antes de guardar: en base de datos solo entran turnos del
        // catálogo y las 7 claves de día.
        const normalizados = normalizarTurnosPorDia(turnosPorDia)
        const algunTurno = DIAS_SEMANA.some(d => normalizados[d].length > 0)
        if (!algunTurno) {
            return NextResponse.json({ error: 'La semana debe tener al menos un turno en algún día' }, { status: 400 })
        }

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        const existente = await prisma.semanaEspecial.findUnique({ where: { semana } })

        const fila = await prisma.semanaEspecial.upsert({
            where: { semana },
            create: {
                semana,
                nombre: String(nombre).trim(),
                turnosPorDia: normalizados,
                activa: true,
                creadoPorId: usuarioId ?? null,
            },
            update: {
                nombre: String(nombre).trim(),
                turnosPorDia: normalizados,
                activa: true,
            },
        })

        await registrarAudit({
            accion: existente ? 'UPDATE' : 'CREATE',
            entidad: 'SemanaEspecial',
            entidadId: fila.id,
            descripcion: `${existente ? 'Actualizado' : 'Configurado'} dispositivo especial "${fila.nombre}" para la semana del ${semana}`,
            usuarioId,
            usuarioNombre,
            modulo: 'Cuadrantes',
            datosNuevos: { semana, nombre: fila.nombre, turnosPorDia: normalizados },
        })

        return NextResponse.json({ success: true, semana, config: construirConfigSemana(fila) })
    } catch (error) {
        console.error('Error POST /api/semanas-especiales:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

/**
 * DELETE /api/semanas-especiales?semana=YYYY-MM-DD
 * Devuelve la semana al reparto habitual de mañana y tarde.
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        if (!puedeGestionar(session)) {
            return NextResponse.json({ error: 'Sin permisos para configurar semanas especiales' }, { status: 403 })
        }

        const semana = new URL(request.url).searchParams.get('semana')
        if (!semana || !FORMATO_SEMANA.test(semana)) {
            return NextResponse.json({ error: 'Semana requerida en formato YYYY-MM-DD' }, { status: 400 })
        }

        const existente = await prisma.semanaEspecial.findUnique({ where: { semana } })
        if (!existente) {
            return NextResponse.json({ error: 'Esa semana no tiene dispositivo especial' }, { status: 404 })
        }

        await prisma.semanaEspecial.delete({ where: { semana } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE',
            entidad: 'SemanaEspecial',
            entidadId: existente.id,
            descripcion: `Eliminado el dispositivo especial "${existente.nombre}" de la semana del ${semana}; vuelve al reparto habitual`,
            usuarioId,
            usuarioNombre,
            modulo: 'Cuadrantes',
        })

        return NextResponse.json({ success: true, config: configSemanaHabitual() })
    } catch (error) {
        console.error('Error DELETE /api/semanas-especiales:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
