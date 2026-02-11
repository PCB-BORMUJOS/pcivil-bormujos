import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const form = await req.formData()
        const file = form.get('file') as File
        const descripcion = form.get('descripcion') as string || ''

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 })
        }

        // Subir a Vercel Blob
        const blob = await put(`psi/${params.id}/${file.name}`, file, {
            access: 'public',
        })

        // Guardar referencia en DB
        const imagen = await prisma.imagenParte.create({
            data: {
                parteId: params.id,
                url: blob.url,
                blobKey: blob.url, // Usamos URL como key si no requerimos borrado complejo, o blob.url
                descripcion,
                orden: 0 // Podríamos calcular max orden + 1
            }
        })

        return NextResponse.json(imagen)
    } catch (error) {
        console.error('Error subiendo imagen PSI:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
