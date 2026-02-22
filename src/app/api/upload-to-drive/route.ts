import { NextRequest, NextResponse } from 'next/server'
import { uploadToGoogleDrive } from '@/lib/google-drive'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const folderId = formData.get('folderId') as string | undefined

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToGoogleDrive(
      buffer,
      fileName || file.name,
      file.type || 'application/pdf',
      folderId
    )

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      url: result.url,
      downloadUrl: result.downloadUrl
    })
  } catch (error: any) {
    console.error('Error subiendo a Google Drive:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
