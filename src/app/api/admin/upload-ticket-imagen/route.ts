import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const filename = `tickets/combustible-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`
    const { url } = await put(filename, file, { access: 'public' })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Error subiendo imagen ticket:', error)
    return NextResponse.json({ error: 'Error subiendo imagen' }, { status: 500 })
  }
}
