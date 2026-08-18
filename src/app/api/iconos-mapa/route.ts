import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { puedeEditarModulo } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { put } from '@vercel/blob'
import { ICONOS_PREDEFINIDOS, urlIconoPredefinido } from '@/lib/iconos-mapa'

function puedeEditar(session: any): boolean {
    return puedeEditarModulo(session, 'planes')
}

/** Crea los iconos predefinidos que falten (idempotente). */
async function sembrarPredefinidos() {
    const existentes = await prisma.iconoMapa.findMany({
        where: { esPredefinido: true },
        select: { url: true },
    })
    const urls = new Set(existentes.map(i => i.url))
    let orden = 0
    for (const ic of ICONOS_PREDEFINIDOS) {
        const url = urlIconoPredefinido(ic.slug)
        if (!urls.has(url)) {
            await prisma.iconoMapa.create({
                data: { nombre: ic.nombre, categoria: ic.categoria, url, esPredefinido: true, orden },
            }).catch(() => { /* carrera de siembra concurrente: ignorar */ })
        }
        orden++
    }
}

/** GET /api/iconos-mapa — lista de iconos (siembra los predefinidos si faltan). */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        await sembrarPredefinidos()

        const iconos = await prisma.iconoMapa.findMany({
            where: { activo: true },
            orderBy: [{ esPredefinido: 'desc' }, { categoria: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
        })
        return NextResponse.json({ iconos })
    } catch (error) {
        console.error('Error GET /api/iconos-mapa:', error)
        return NextResponse.json({ error: 'Error obteniendo los iconos' }, { status: 500 })
    }
}

/** POST /api/iconos-mapa — sube un icono propio (multipart: archivo, nombre, categoria). */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden subir iconos' }, { status: 403 })
        }

        const form = await request.formData()
        const archivo = form.get('archivo') as File | null
        const nombre = String(form.get('nombre') || '').trim()
        const categoria = String(form.get('categoria') || 'Propios').trim() || 'Propios'

        if (!archivo) return NextResponse.json({ error: 'No se ha recibido ningún archivo' }, { status: 400 })
        const tipo = archivo.type
        if (!/^image\/(png|svg\+xml|jpeg|webp|gif)$/.test(tipo)) {
            return NextResponse.json({ error: 'El icono debe ser una imagen PNG, SVG, JPG, WEBP o GIF' }, { status: 400 })
        }
        if (archivo.size > 512 * 1024) {
            return NextResponse.json({ error: 'El icono no puede superar los 512 KB' }, { status: 400 })
        }

        const ext = tipo === 'image/svg+xml' ? 'svg'
            : tipo === 'image/png' ? 'png'
            : tipo === 'image/webp' ? 'webp'
            : tipo === 'image/gif' ? 'gif' : 'jpg'
        const baseNombre = (nombre || archivo.name.replace(/\.[^.]+$/, '') || 'icono')
            .replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 50)

        const blob = await put(
            `iconos-mapa/${Date.now()}-${baseNombre}.${ext}`,
            archivo,
            { access: 'public', contentType: tipo },
        )

        const maxOrden = await prisma.iconoMapa.aggregate({ _max: { orden: true }, where: { esPredefinido: false } })
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        const icono = await prisma.iconoMapa.create({
            data: {
                nombre: nombre || baseNombre,
                categoria,
                url: blob.url,
                blobKey: blob.pathname,
                esPredefinido: false,
                orden: (maxOrden._max.orden ?? 100) + 1,
                creadoPorId: usuarioId ?? null,
            },
        })

        await registrarAudit({
            accion: 'CREATE', entidad: 'IconoMapa', entidadId: icono.id,
            descripcion: `Icono de mapa subido: ${icono.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true, icono })
    } catch (error) {
        console.error('Error POST /api/iconos-mapa:', error)
        return NextResponse.json({ error: 'Error subiendo el icono' }, { status: 500 })
    }
}
