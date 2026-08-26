import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit, compararCambios } from '@/lib/audit'

/** GET /api/partes/prf/[id] — un parte. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        const parte = await prisma.partePAS.findUnique({ where: { id: params.id } })
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

        const existente = await prisma.partePAS.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

        const body = await request.json()
        const data: any = {}
        if (typeof body.estado === 'string') data.estado = body.estado === 'completo' ? 'completo' : 'borrador'
        if (typeof body.archivado === 'boolean') data.archivado = body.archivado
        if (body.datos && typeof body.datos === 'object') {
            data.datos = body.datos
            data.numeroInforme = body.datos.numeroInforme ? String(body.datos.numeroInforme) : null
            data.lugar = body.datos.lugar ? String(body.datos.lugar) : null
            data.motivo = body.datos.motivo ? String(body.datos.motivo) : null
            data.pacienteNombre = [body.datos.nombre, body.datos.apellidos].filter(Boolean).join(' ').trim() || null
            data.pacienteDni = body.datos.dniNie ? String(body.datos.dniNie) : null
            data.traslado = body.datos.renunciaSinTraslado ? 'renuncia'
                : (body.datos.renunciaSinAsistencia ? 'sin asistencia' : null)
        }
        if (Array.isArray(body.lesiones)) data.lesiones = body.lesiones
        if (body.firmas && typeof body.firmas === 'object') data.firmas = body.firmas
        if (typeof body.pdfUrl === 'string') { data.pdfUrl = body.pdfUrl; data.pdfGenerado = true }
        if (typeof body.googleDriveId === 'string') data.googleDriveId = body.googleDriveId
        if (typeof body.googleDriveUrl === 'string') data.googleDriveUrl = body.googleDriveUrl

        const parte = await prisma.partePAS.update({ where: { id: params.id }, data })

        const cambios = compararCambios(existente as any, data as any)
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'UPDATE', entidad: 'PartePAS', entidadId: parte.id,
            // Se deja constancia de que campos ha tocado esta edicion, para poder
            // saber quien cambio que cuando varias personas editan el mismo parte.
            descripcion: `Parte PAS actualizado: ${parte.numeroParte}`
                + (cambios.campos.length ? ` · campos: ${cambios.campos.join(', ')}` : ' · sin cambios en los datos'),
            usuarioId, usuarioNombre, modulo: 'Partes',
            datosAnteriores: cambios.antes, datosNuevos: cambios.despues,
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
        const existente = await prisma.partePAS.findUnique({ where: { id: params.id } })
        if (!existente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

        const hard = new URL(request.url).searchParams.get('hard') === 'true'
        if (hard) await prisma.partePAS.delete({ where: { id: params.id } })
        else await prisma.partePAS.update({ where: { id: params.id }, data: { archivado: true } })

        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
            accion: 'DELETE', entidad: 'PartePAS', entidadId: params.id,
            descripcion: `Parte PAS ${hard ? 'borrado' : 'archivado'}: ${existente.numeroParte}`,
            usuarioId, usuarioNombre, modulo: 'Partes',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error DELETE /api/partes/prf/[id]:', error)
        return NextResponse.json({ error: 'Error borrando el parte' }, { status: 500 })
    }
}
