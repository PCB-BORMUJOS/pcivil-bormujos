import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

/** GET /api/partes/prf/[id] — un parte. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        const parte = await prisma.partePRF.findUnique({ where: { id: params.id } })
        if (!parte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        return NextResponse.json({ parte })
    } catch (error) {
        console.error('Error GET /api/partes/prf/[id]:', error)
        return NextResponse.json({ error: 'Error obteniendo el parte' }, { status: 500 })
    }
}

/** PUT /api/partes/prf/[id] — actualiza el parte. */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const existente = await prisma.partePRF.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

        const body = await request.json()
        const data: any = {}
        if (typeof body.estado === 'string') data.estado = body.estado === 'completo' ? 'completo' : 'borrador'
        if (typeof body.archivado === 'boolean') data.archivado = body.archivado
        if (body.datos && typeof body.datos === 'object') {
            data.datos = body.datos
            data.expediente = body.datos.expediente ? String(body.datos.expediente) : null
            data.nombreCaseta = body.datos.nombreCaseta ? String(body.datos.nombreCaseta) : null
            data.numeroCaseta = body.datos.numeroCaseta ? String(body.datos.numeroCaseta) : null
            data.resultado = body.datos.resultado ? String(body.datos.resultado) : null
        }
        if (body.fotosUrls && typeof body.fotosUrls === 'object') data.fotosUrls = body.fotosUrls
        if (body.firmas && typeof body.firmas === 'object') data.firmas = body.firmas
        if (typeof body.pdfUrl === 'string') { data.pdfUrl = body.pdfUrl; data.pdfGenerado = true }
        if (typeof body.googleDriveId === 'string') data.googleDriveId = body.googleDriveId
        if (typeof body.googleDriveUrl === 'string') data.googleDriveUrl = body.googleDriveUrl

        const parte = await prisma.partePRF.update({ where: { id: params.id }, data })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'PartePRF', entidadId: parte.id,
            descripcion: `Parte PRF actualizado: ${parte.numeroParte}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json({ success: true, parte })
    } catch (error) {
        console.error('Error PUT /api/partes/prf/[id]:', error)
        return NextResponse.json({ error: 'Error actualizando el parte' }, { status: 500 })
    }
}

/** DELETE /api/partes/prf/[id] — archiva (borrado lógico) o borra definitivo con ?hard=true. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        const existente = await prisma.partePRF.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

        const hard = new URL(request.url).searchParams.get('hard') === 'true'
        if (hard) await prisma.partePRF.delete({ where: { id: params.id } })
        else await prisma.partePRF.update({ where: { id: params.id }, data: { archivado: true } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'PartePRF', entidadId: params.id,
            descripcion: `Parte PRF ${hard ? 'borrado' : 'archivado'}: ${existente.numeroParte}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/partes/prf/[id]:', error)
        return NextResponse.json({ error: 'Error borrando el parte' }, { status: 500 })
    }
}
