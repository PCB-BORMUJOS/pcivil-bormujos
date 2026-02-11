import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import PartePDF from '@/lib/generarPartePDF'

/**
 * GET /api/partes/psi/[id]/pdf
 * Genera el PDF del parte
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // In Next 13+ App Router, params is a promise in recent versions or just an object.
        // However, if we are in strict mode, we should treat it carefully. 
        // Usually standard is { params: { id: string } } as second arg.
        const { id } = params

        // Obtener parte de la base de datos
        const parte = await prisma.partePSI.findUnique({
            where: { id },
            include: {
                creadoPor: {
                    select: { nombre: true, apellidos: true, numeroVoluntario: true }
                }
            }
        })

        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        // Generar PDF usando react-pdf/renderer
        // Note: renderToBuffer might be slow, be careful with timeouts.
        const pdfBuffer = await renderToBuffer(<PartePDF data={parte} />)

        // Determinar si es descarga o visualización
        const { searchParams } = new URL(request.url)
        const isDownload = searchParams.get('download') === 'true'

        const disposition = isDownload
            ? `attachment; filename="PSI-${parte.numeroParte}.pdf"`
            : `inline; filename="PSI-${parte.numeroParte}.pdf"`

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': disposition
            }
        })
    } catch (error) {
        console.error('Error generando PDF:', error)
        return NextResponse.json(
            { error: 'Error generando PDF' },
            { status: 500 }
        )
    }
}
