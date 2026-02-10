import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// GET: Obtener guardias de una semana específica
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const semana = searchParams.get('semana')

        if (!semana) {
            return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
        }

        // Calcular inicio y fin de la semana (lunes a domingo)
        const inicioSemana = new Date(semana)
        const finSemana = new Date(inicioSemana)
        finSemana.setDate(finSemana.getDate() + 6)

        const guardias = await prisma.guardia.findMany({
            where: {
                fecha: {
                    gte: inicioSemana,
                    lte: finSemana
                }
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        numeroVoluntario: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { fecha: 'asc' },
                { turno: 'asc' }
            ]
        })

        return NextResponse.json({ guardias })
    } catch (error) {
        console.error('Error al obtener guardias:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// POST: Crear nueva guardia
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Verificar que el usuario sea administrador
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true }
        })

        if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
            return NextResponse.json({ error: 'No tienes permisos para crear guardias' }, { status: 403 })
        }

        const body = await request.json()
        const { fecha, turno, usuarioId, tipo, notas, servicioId } = body

        if (!fecha || !turno || !usuarioId) {
            return NextResponse.json({
                error: 'Fecha, turno y usuarioId son requeridos'
            }, { status: 400 })
        }

        // Verificar que no exista ya una guardia para este usuario en esta fecha/turno
        const existente = await prisma.guardia.findFirst({
            where: {
                usuarioId,
                fecha: new Date(fecha),
                turno
            }
        })

        if (existente) {
            return NextResponse.json({
                error: 'Ya existe una guardia para este usuario en esta fecha y turno'
            }, { status: 400 })
        }

        // Usar el servicio del usuario si no se proporciona uno
        const usuarioAsignado = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        })

        const guardia = await prisma.guardia.create({
            data: {
                fecha: new Date(fecha),
                turno,
                tipo: tipo || 'programada',
                notas: notas || '',
                usuarioId,
                servicioId: servicioId || usuarioAsignado?.servicioId || '',
                estado: 'programada'
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        numeroVoluntario: true
                    }
                }
            }
        })

        return NextResponse.json({ success: true, guardia })
    } catch (error) {
        console.error('Error al crear guardia:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// PUT: Actualizar guardia existente
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true }
        })

        if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
            return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
        }

        const body = await request.json()
        const { id, tipo, notas, estado } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        const guardia = await prisma.guardia.update({
            where: { id },
            data: {
                ...(tipo && { tipo }),
                ...(notas !== undefined && { notas }),
                ...(estado && { estado })
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        numeroVoluntario: true
                    }
                }
            }
        })

        return NextResponse.json({ success: true, guardia })
    } catch (error) {
        console.error('Error al actualizar guardia:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// DELETE: Eliminar guardia
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true }
        })

        if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
            return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        await prisma.guardia.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error al eliminar guardia:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
