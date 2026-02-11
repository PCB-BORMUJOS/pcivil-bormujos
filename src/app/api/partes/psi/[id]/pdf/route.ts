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
                imagenes: true
            }
        })

        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        // TODO: Implementar generación real de PDF
        // Por ahora retornamos un JSON o un mensaje
        return NextResponse.json({
            message: 'Endpoint de generación de PDF pendiente de implementación final',
            parteId: parte.id
        })
    } catch (error) {
        console.error('Error generando PDF PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
