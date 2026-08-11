import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'

// Anchura máxima para las fotos adjuntas al parte PSI.
// Si la imagen original es más ancha, se escala manteniendo proporción.
const MAX_WIDTH = 1600

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const imagen = formData.get('imagen') as File | null
    const numeroParte = (formData.get('numeroParte') as string || 'sin-numero').replace(/[^a-zA-Z0-9_-]/g, '_')
    const indice = formData.get('pagina') as string || '1'

    if (!imagen) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const inputBuffer = Buffer.from(await imagen.arrayBuffer())

    // Comprimir/optimizar con Sharp para el mínimo tamaño sin perder detalle útil
    // (impresión a tamaño parte). Se respeta la orientación EXIF y se eliminan los
    // metadatos (sharp los descarta por defecto al no usar withMetadata()).
    const comprimido = await sharp(inputBuffer)
      .rotate() // respeta la orientación EXIF antes de perder los metadatos
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer()

    const blob = await put(
      `partes/psi/${numeroParte}/foto-${indice}.jpg`,
      comprimido,
      { access: 'public', contentType: 'image/jpeg' }
    )

    return NextResponse.json({ ok: true, url: blob.url })

  } catch (error: any) {
    console.error('[psi/importar/imagen]', error)
    return NextResponse.json({ error: error.message || 'Error subiendo imagen' }, { status: 500 })
  }
}
