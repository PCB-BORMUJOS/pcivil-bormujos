import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

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
    const pagina = formData.get('pagina') as string || '1'

    if (!imagen) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const buffer = Buffer.from(await imagen.arrayBuffer())
    const blob = await put(
      `partes/psi/${numeroParte}/pagina-${pagina}.png`,
      buffer,
      { access: 'public', contentType: 'image/png' }
    )

    return NextResponse.json({ ok: true, url: blob.url })

  } catch (error: any) {
    console.error('[psi/importar/imagen]', error)
    return NextResponse.json({ error: error.message || 'Error subiendo imagen' }, { status: 500 })
  }
}
