import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

// Sube el documento de una póliza (PDF o imagen) y devuelve su URL pública,
// para poder consultarlo como referencia cuando se necesite.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const rol = (session.user as any)?.rol?.toLowerCase() || ''
    const nivel = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string, number>)[rol] ?? 1
    if (nivel < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const filename = `polizas/poliza-${Date.now()}.${ext}`
    const { url } = await put(filename, file, { access: 'public' })

    return NextResponse.json({ success: true, url, nombre: file.name })
  } catch (error) {
    console.error('Error subiendo documento de póliza:', error)
    return NextResponse.json({ error: 'Error subiendo el documento' }, { status: 500 })
  }
}
