import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { put, del } from '@vercel/blob'

function puedeEditar(session: any): boolean {
    return getNivel((session?.user as any)?.rol ?? '') >= 4
}

const MAX_BYTES = 25 * 1024 * 1024   // 25 MB por documento
const TIPOS_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

/**
 * POST /api/planes/[id]/documentos
 * Sube un documento (PDF o imagen) y lo asocia al plan.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden subir documentos' }, { status: 403 })
        }

        const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { id: true, nombre: true } })
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

        const form = await request.formData()
        const archivo = form.get('archivo') as File | null
        const titulo = String(form.get('titulo') || '').trim()
        const tipo = String(form.get('tipo') || 'plan')

        if (!archivo) return NextResponse.json({ error: 'No se ha recibido ningún archivo' }, { status: 400 })
        if (archivo.size === 0) return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
        if (archivo.size > MAX_BYTES) {
            return NextResponse.json({ error: `El archivo supera el máximo de 25 MB (ocupa ${(archivo.size / 1048576).toFixed(1)} MB)` }, { status: 400 })
        }
        if (!TIPOS_MIME.includes(archivo.type)) {
            return NextResponse.json({ error: 'Solo se admiten PDF o imágenes (PNG, JPG, WEBP)' }, { status: 400 })
        }

        const nombreLimpio = archivo.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 100)
        const ruta = `planes/${plan.id}/${Date.now()}-${nombreLimpio}`

        const blob = await put(ruta, archivo, { access: 'public', contentType: archivo.type })

        const doc = await prisma.planDocumento.create({
            data: {
                planId: plan.id,
                titulo: titulo || archivo.name,
                tipo,
                url: blob.url,
                blobKey: blob.pathname,
                nombreArchivo: archivo.name,
                tamano: archivo.size,
            },
        })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'CREATE', entidad: 'PlanDocumento', entidadId: doc.id,
            descripcion: `Documento "${doc.titulo}" añadido al plan ${plan.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, documento: doc })
    } catch (error) {
        console.error('Error POST documento de plan:', error)
        return NextResponse.json({ error: 'Error subiendo el documento' }, { status: 500 })
    }
}

/**
 * DELETE /api/planes/[id]/documentos?docId=...
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden borrar documentos' }, { status: 403 })
        }

        const docId = new URL(request.url).searchParams.get('docId')
        if (!docId) return NextResponse.json({ error: 'Falta el identificador del documento' }, { status: 400 })

        const doc = await prisma.planDocumento.findUnique({ where: { id: docId } })
        if (!doc || doc.planId !== params.id) {
            return NextResponse.json({ error: 'Documento no encontrado en este plan' }, { status: 404 })
        }

        try { await del(doc.url) } catch (e) { console.error('No se pudo borrar el fichero del almacenamiento:', e) }
        await prisma.planDocumento.delete({ where: { id: docId } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'PlanDocumento', entidadId: docId,
            descripcion: `Documento "${doc.titulo}" eliminado`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE documento de plan:', error)
        return NextResponse.json({ error: 'Error eliminando el documento' }, { status: 500 })
    }
}
