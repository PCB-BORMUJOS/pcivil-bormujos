import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'

// Imágenes de hidrante (ubicación / detalle). Se comprimen y optimizan al máximo
// razonable: se redimensionan a 1280px de ancho y se guardan como JPEG de calidad
// moderada para que pesen lo mínimo indispensable.
const MAX_WIDTH = 1280

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const formData = await request.formData()
    const imagen = formData.get('imagen') as File | null
    const codigo = ((formData.get('codigo') as string) || 'sin-codigo').replace(/[^a-zA-Z0-9_-]/g, '_')
    const tipoFoto = ((formData.get('tipoFoto') as string) || 'foto').replace(/[^a-zA-Z0-9_-]/g, '_')

    if (!imagen) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const inputBuffer = Buffer.from(await imagen.arrayBuffer())
    const comprimido = await sharp(inputBuffer)
      .rotate() // respeta la orientación EXIF
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 70, progressive: true, mozjpeg: true })
      .toBuffer()

    const blob = await put(
      `hidrantes/${codigo}/${tipoFoto}-${Date.now()}.jpg`,
      comprimido,
      { access: 'public', contentType: 'image/jpeg' }
    )

    return NextResponse.json({ ok: true, url: blob.url, bytes: comprimido.length })
  } catch (error: any) {
    console.error('[incendios/hidrante-imagen]', error)
    return NextResponse.json({ error: error.message || 'Error subiendo imagen' }, { status: 500 })
  }
}
