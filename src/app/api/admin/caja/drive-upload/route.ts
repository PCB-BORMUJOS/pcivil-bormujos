import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { uploadToGoogleDrive } from '@/lib/google-drive'

// ID de la carpeta de Tickets de Caja en Google Drive
const CAJA_TICKETS_FOLDER_ID = process.env.CAJA_TICKETS_FOLDER_ID || ''

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

        // Leer archivo como buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Nombre del archivo en Drive
        const filename = `Caja_${movimientoId || 'sin-id'}_${new Date().toISOString().split('T')[0]}.pdf`

        // Subir a Drive en la carpeta de Tickets de Caja
        const driveFile = await uploadToGoogleDrive(buffer, filename, 'application/pdf', CAJA_TICKETS_FOLDER_ID)

        return NextResponse.json({
            success: true,
            webViewLink: driveFile.url,
            mensaje: 'Ticket subido a Google Drive correctamente'
        })

    } catch (error) {
        console.error('Error en /api/admin/caja/drive-upload:', error)
        return NextResponse.json(
            { error: 'Error subiendo archivo a Drive' },
            { status: 500 }
        )
    }
}
