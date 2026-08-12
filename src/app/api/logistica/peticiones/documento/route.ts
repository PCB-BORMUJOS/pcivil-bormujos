import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

// Sube el documento de una petición (albarán / RC) en PDF o imagen y devuelve
// su URL pública, para adjuntarlo a la trazabilidad del pedido.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rol = (session.user as any)?.rol?.toLowerCase() || ''
    const nivel = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string, number>)[rol] ?? 1
    if (nivel < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tipo = ((formData.get('tipo') as string) || 'albaran').replace(/[^a-z]/gi, '') || 'albaran'
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    // Solo PDF o imágenes; límite de tamaño razonable.
    const esValido = file.type === 'application/pdf' || file.type.startsWith('image/') || /\.(pdf|png|jpe?g|webp)$/i.test(file.name || '')
    if (!esValido) return NextResponse.json({ error: 'El archivo debe ser un PDF o una imagen' }, { status: 400 })
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 15 MB)' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
    const filename = `logistica/peticiones/${tipo}-${Date.now()}.${ext}`
    const { url } = await put(filename, file, { access: 'public' })

    return NextResponse.json({ success: true, url, nombre: file.name })
  } catch (error) {
    console.error('Error subiendo documento de petición:', error)
    return NextResponse.json({ error: 'Error subiendo el documento' }, { status: 500 })
  }
}
