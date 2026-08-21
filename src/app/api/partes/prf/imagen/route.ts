import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'

/** POST /api/partes/prf/imagen — sube y comprime una foto del parte a Vercel Blob. */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const form = await request.formData()
        const archivo = form.get('archivo') as File | null
        const categoria = String(form.get('categoria') || 'foto').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 40)
        if (!archivo) return NextResponse.json({ error: 'No se ha recibido ninguna imagen' }, { status: 400 })
        if (!archivo.type.startsWith('image/')) return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })

        const entrada = Buffer.from(await archivo.arrayBuffer())
        // Comprimir: máx 1600px lado mayor, JPEG calidad 78 (fotos de acta).
        const comprimida = await sharp(entrada)
            .rotate()
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 78 })
            .toBuffer()

        const blob = await put(
            `partes-prf/${Date.now()}-${categoria}.jpg`,
            comprimida,
            { access: 'public', contentType: 'image/jpeg' },
        )
        return NextResponse.json({ success: true, url: blob.url })
    } catch (error) {
        console.error('Error POST /api/partes/prf/imagen:', error)
        return NextResponse.json({ error: 'Error subiendo la imagen' }, { status: 500 })
    }
}
