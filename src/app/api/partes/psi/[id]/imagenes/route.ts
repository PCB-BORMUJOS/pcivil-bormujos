
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = `partes/psi/${params.id}/${Date.now()}-${file.name}`

        // Subir a Vercel Blob
        const { url } = await put(filename, buffer, {
            access: 'public',
            contentType: file.type
        })


        // Actualizar el parte con la nueva URL de la foto
        // Primero obtenemos el parte actual para añadir a la lista de fotos
        const parte = await prisma.partePSI.findUnique({
            where: { id: params.id }
        })

        if (!parte) {
            return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })
        }

        const nuevasFotos = [...(parte.fotosUrls as string[] || []), url]

        await prisma.partePSI.update({
            where: { id: params.id },
            data: {
                fotosUrls: nuevasFotos
            }
        })

        return NextResponse.json({
            id: url, // Usamos la URL como ID temporalmente para el frontend
            url: url,
            descripcion: file.name
        })

    } catch (error) {
        console.error('Error subiendo imagen:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
