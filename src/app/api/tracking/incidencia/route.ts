import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Endpoint SIN sesión, autenticado por TRACKING_TOKEN (igual que el de ubicación),
// pensado para los iPads de los vehículos (modo kiosco). Entrega la incidencia
// activa asignada al vehículo y permite marcar las isócronas desde la tablet.

function getHoraActual(): string {
    return new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })
}

function tokenValido(token: string | null): boolean {
    return !process.env.TRACKING_TOKEN || token === process.env.TRACKING_TOKEN
}

async function resolverVehiculo(vehiculoId: string) {
    let vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } })
    if (!vehiculo) {
        vehiculo = await prisma.vehiculo.findFirst({ where: { indicativo: vehiculoId.toUpperCase() } })
    }
    return vehiculo
}

// GET: incidencia activa asignada a este vehículo (o null).
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const vehiculoId = searchParams.get('vehiculoId') || ''
    const token = searchParams.get('token')

    if (!tokenValido(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!vehiculoId) return NextResponse.json({ error: 'Falta vehiculoId' }, { status: 400 })

    const vehiculo = await resolverVehiculo(vehiculoId)
    if (!vehiculo) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })

    const activas = await prisma.incidenciaCecopal.findMany({
        where: { estado: 'activa' },
        orderBy: { createdAt: 'desc' },
    })
    const incidencia = activas.find(i => Array.isArray(i.vehiculosIds) && (i.vehiculosIds as any[]).includes(vehiculo.id))

    if (!incidencia) return NextResponse.json({ incidencia: null, vehiculo: vehiculo.indicativo })

    return NextResponse.json({
        vehiculo: vehiculo.indicativo,
        incidencia: {
            id: incidencia.id,
            numero: incidencia.numero,
            tipoIncidencia: incidencia.tipoIncidencia,
            direccion: incidencia.direccion,
            descripcion: incidencia.descripcion,
            latitud: incidencia.latitud,
            longitud: incidencia.longitud,
            horaLlamada: incidencia.horaLlamada,
            horaSalida: incidencia.horaSalida,
            horaLlegada: incidencia.horaLlegada,
            horaTerminado: incidencia.horaTerminado,
            horaDisponible: incidencia.horaDisponible,
        },
    })
}

// POST: marcar una isócrona (Salida → Disponible) desde la tablet.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { vehiculoId, token, incidenciaId, campo } = body

        if (!tokenValido(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const camposValidos = ['horaSalida', 'horaLlegada', 'horaTerminado', 'horaDisponible']
        if (!incidenciaId || !camposValidos.includes(campo)) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
        }

        const vehiculo = await resolverVehiculo(vehiculoId || '')
        if (!vehiculo) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })

        const incidencia = await prisma.incidenciaCecopal.findUnique({ where: { id: incidenciaId } })
        if (!incidencia) return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 })
        if (!Array.isArray(incidencia.vehiculosIds) || !(incidencia.vehiculosIds as any[]).includes(vehiculo.id)) {
            return NextResponse.json({ error: 'La incidencia no está asignada a este vehículo' }, { status: 403 })
        }

        // No se sobreescribe una isócrona ya marcada.
        if ((incidencia as any)[campo]) {
            return NextResponse.json({ ok: true, yaMarcada: true, valor: (incidencia as any)[campo] })
        }

        const valor = getHoraActual()
        await prisma.incidenciaCecopal.update({ where: { id: incidenciaId }, data: { [campo]: valor } })
        return NextResponse.json({ ok: true, campo, valor })
    } catch (error) {
        console.error('Error tracking/incidencia POST:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
