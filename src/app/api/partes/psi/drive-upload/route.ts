import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { uploadToGoogleDrive } from '@/lib/google-drive'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const parteId = formData.get('parteId') as string
        const numeroParte = formData.get('numeroParte') as string

        if (!file || !parteId) {
            return NextResponse.json({ error: 'Faltan datos (file, parteId)' }, { status: 400 })
        }

        // Leer archivo como buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Nombre del archivo en Drive
        const filename = `PSI_${numeroParte || 'sin-numero'}_${new Date().toISOString().split('T')[0]}.pdf`

        // Subir a Drive
        const driveFile = await uploadToGoogleDrive(buffer, filename)

        // Actualizar base de datos
        const parte = await prisma.partePSI.update({
            where: { id: parteId },
            data: {
                googleDriveId: driveFile.fileId,
                googleDriveUrl: driveFile.url
            }
        })

        return NextResponse.json({
            success: true,
            googleDriveUrl: driveFile.url,
            mensaje: 'PDF subido a Google Drive correctamente'
        })

    } catch (error) {
        console.error('Error en /api/partes/psi/drive-upload:', error)
        return NextResponse.json(
            { error: 'Error subiendo archivo a Drive' },
            { status: 500 }
        )
    }
}
