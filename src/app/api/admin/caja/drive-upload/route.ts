import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const movimientoId = formData.get('movimientoId') as string

        if (!file) {
            return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Nombre del archivo: Caja_{movimientoId}_{fecha}.pdf
        const fecha = new Date().toISOString().split('T')[0]
        const filename = `caja-tickets/Caja_${movimientoId || 'sin-id'}_${fecha}.pdf`

        // Subir a Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: 'application/pdf'
        })

        return NextResponse.json({
            success: true,
            webViewLink: blob.url,
            mensaje: 'Ticket subido a Vercel Blob correctamente'
        })

    } catch (error) {
        console.error('Error en /api/admin/caja/drive-upload:', error)
        return NextResponse.json(
            { error: 'Error subiendo archivo' },
            { status: 500 }
        )
    }
}
