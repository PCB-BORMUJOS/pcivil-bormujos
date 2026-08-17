import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNivel } from '@/lib/permisos'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { del } from '@vercel/blob'

function puedeEditar(session: any): boolean {
    return getNivel((session?.user as any)?.rol ?? '') >= 4
}

/** DELETE /api/iconos-mapa/[id] — borra un icono propio (los predefinidos no se borran). */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!puedeEditar(session)) {
            return NextResponse.json({ error: 'Solo coordinación o jefatura pueden borrar iconos' }, { status: 403 })
        }

        const icono = await prisma.iconoMapa.findUnique({ where: { id: params.id } })
        if (!icono) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        if (icono.esPredefinido) {
            return NextResponse.json({ error: 'Los iconos predefinidos no se pueden borrar' }, { status: 400 })
        }

        if (icono.url) { try { await del(icono.url) } catch (e) { console.error('No se pudo borrar el blob del icono:', e) } }
        await prisma.iconoMapa.delete({ where: { id: params.id } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'IconoMapa', entidadId: params.id,
            descripcion: `Icono de mapa borrado: ${icono.nombre}`,
            usuarioId, usuarioNombre, modulo: 'Planes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/iconos-mapa/[id]:', error)
        return NextResponse.json({ error: 'Error borrando el icono' }, { status: 500 })
    }
}
