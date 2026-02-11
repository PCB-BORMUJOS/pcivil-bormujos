import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const data = await req.json()

        // Generar número correlativo si no viene (YYYY-NNN)
        let numero = data.numero
        if (!numero) {
            const year = new Date().getFullYear()
            const count = await prisma.partePSI.count({
                where: {
                    createdAt: {
                        gte: new Date(year, 0, 1),
                        lt: new Date(year + 1, 0, 1)
                    }
                }
            })
            numero = `${year}-${String(count + 1).padStart(3, '0')}`
        }

        const parte = await prisma.partePSI.create({
            data: {
                ...data,
                numero,
                fecha: new Date(data.fecha), // Asegurar formato Date
                creadorId: session.user.id,
            }
        })

        return NextResponse.json(parte)
    } catch (error) {
        console.error('Error creando parte PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const partes = await prisma.partePSI.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creador: {
                    select: { nombre: true, email: true }
                },
                imagenes: true
            },
            take: 50 // Límite por defecto
        })

        return NextResponse.json(partes)
    } catch (error) {
        console.error('Error listando partes PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
