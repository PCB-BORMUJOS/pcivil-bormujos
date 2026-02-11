import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const parte = await prisma.partePSI.findUnique({
            where: { id: params.id },
            include: {
                creadoPor: {
                    select: { nombre: true, apellidos: true, numeroVoluntario: true }
                }
            }
        })

        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error obteniendo parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const data = await req.json()

        // Evitar actualizar campos protegidos
        delete data.id
        delete data.numero
        delete data.creadorId
        delete data.createdAt
        delete data.updatedAt

        const parte = await prisma.partePSI.update({
            where: { id: params.id },
            data: {
                ...data,
                fecha: data.fecha ? new Date(data.fecha) : undefined
            }
        })

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error actualizando parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Opcional: Validar permisos extras para borrar

        await prisma.partePSI.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error eliminando parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
