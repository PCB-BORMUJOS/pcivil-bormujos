import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadToGoogleDrive } from '@/lib/google-drive'
import { PDFDocument } from 'pdf-lib'

const CAJA_TICKETS_FOLDER_ID = process.env.CAJA_TICKETS_FOLDER_ID

async function comprimirPDF(buffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    // useObjectStreams activa xref streams + compresión deflate en streams de contenido
    const comprimido = await pdfDoc.save({ useObjectStreams: true })
    const bufferComprimido = Buffer.from(comprimido)
    // Solo devolver comprimido si realmente es más pequeño
    return bufferComprimido.length < buffer.length ? bufferComprimido : buffer
  } catch {
    // Si el PDF no se puede procesar (cifrado, corrupto) subir el original
    return buffer
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const movimientoId = formData.get('movimientoId') as string

    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bufferOriginal = Buffer.from(arrayBuffer)
    const tamanoOriginal = bufferOriginal.length

    const bufferFinal = await comprimirPDF(bufferOriginal)
    const tamanoFinal = bufferFinal.length
    const ahorroKb = Math.round((tamanoOriginal - tamanoFinal) / 1024)
    const pct = Math.round((1 - tamanoFinal / tamanoOriginal) * 100)

    const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
    const filename = `Justificante_Caja_${movimientoId || fecha}_${fecha}.pdf`

    const driveFile = await uploadToGoogleDrive(bufferFinal, filename, 'application/pdf', CAJA_TICKETS_FOLDER_ID)

    return NextResponse.json({
      success: true,
      webViewLink: driveFile.url,
      tamanoOriginalKb: Math.round(tamanoOriginal / 1024),
      tamanoFinalKb: Math.round(tamanoFinal / 1024),
      ahorroKb,
      reduccionPct: pct,
      mensaje: `Justificante subido correctamente${ahorroKb > 0 ? ` (comprimido ${pct}%, ahorrado ${ahorroKb} KB)` : ''}`,
    })
  } catch (error) {
    console.error('Error en /api/admin/caja/drive-upload:', error)
    return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 })
  }
}
