import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

// Cliente con cast para los modelos nuevos del LMS (mismo patrón que /api/formacion)
const db = prisma as any

// ============================================================
// Control de acceso: nivel de rol >= 4 (coordinador/admin/superadmin/visor)
// o personal del área de Formación (principal o secundaria).
// ============================================================
async function puedeGestionarFormacion(session: any): Promise<boolean> {
    const rol = (session?.user as any)?.rol ?? 'voluntario'
    const nivel = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string, number>)[rol] ?? 1
    if (nivel >= 4) return true
    const email = session?.user?.email
    if (!email) return false
    const u = await db.usuario.findUnique({
        where: { email },
        select: { fichaVoluntario: { select: { areaAsignada: true, areaSecundaria: true } } },
    })
    const esForm = (s?: string | null) => {
        const n = (s || '').toLowerCase()
        return n === 'formación' || n === 'formacion'
    }
    return esForm(u?.fichaVoluntario?.areaAsignada) || esForm(u?.fichaVoluntario?.areaSecundaria)
}

// Plantilla ESPA — curso básico (Orden 21/10/2019, BOJA 207).
// Total: 45 h, de ellas 13 h prácticas.
const PLANTILLA_ESPA_BASICO = [
    { codigo: 'B1', titulo: 'La Protección Civil en la Comunidad Autónoma de Andalucía', horas: 9, horasPracticas: 0 },
    { codigo: 'B2', titulo: 'Primeros Auxilios', horas: 11, horasPracticas: 6 },
    { codigo: 'B3', titulo: 'Contraincendios y salvamento', horas: 10, horasPracticas: 4 },
    { codigo: 'B4', titulo: 'Telecomunicaciones', horas: 7, horasPracticas: 3 },
    { codigo: 'B5', titulo: 'Acción social', horas: 7, horasPracticas: 0 },
    { codigo: 'B6', titulo: 'Evaluación del curso', horas: 1, horasPracticas: 0 },
]

// ============================================================
// GET /api/formacion/curriculo?cursoId=XXX
// Devuelve el árbol completo del currículo de un curso.
// ============================================================
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const cursoId = searchParams.get('cursoId')
        if (!cursoId) return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 })

        const curso = await db.curso.findUnique({
            where: { id: cursoId },
            select: { id: true, codigo: true, nombre: true, modalidad: true, duracionHoras: true, nivelFormacion: true, tipo: true },
        })
        if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

        const bloques = await db.bloqueTematico.findMany({
            where: { cursoId },
            orderBy: { orden: 'asc' },
            include: {
                lecciones: {
                    orderBy: { orden: 'asc' },
                    include: { recursos: { orderBy: { orden: 'asc' } } },
                },
                _count: { select: { examenes: true, actividades: true, accionesPractica: true } },
            },
        })

        const totalHoras = bloques.reduce((s: number, b: any) => s + (b.horas || 0), 0)
        const totalPracticas = bloques.reduce((s: number, b: any) => s + (b.horasPracticas || 0), 0)
        const totalLecciones = bloques.reduce((s: number, b: any) => s + (b.lecciones?.length || 0), 0)

        return NextResponse.json({
            curso,
            bloques,
            resumen: {
                totalBloques: bloques.length,
                totalLecciones,
                totalHoras,
                totalPracticas,
                // Validación de mínimos ESPA para curso básico
                cumpleBasico: totalHoras >= 45 && totalPracticas >= 13,
            },
        })
    } catch (e: any) {
        console.error('[curriculo][GET]', e)
        return NextResponse.json({ error: 'Error al cargar el currículo' }, { status: 500 })
    }
}

// ============================================================
// POST /api/formacion/curriculo
// body.tipo: 'bloque' | 'leccion' | 'recurso' | 'plantilla-espa'
// ============================================================
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!(await puedeGestionarFormacion(session))) return NextResponse.json({ error: 'Sin permisos para gestionar formación' }, { status: 403 })

        const body = await request.json()
        const tipo = body.tipo
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        switch (tipo) {
            case 'bloque': {
                if (!body.cursoId || !body.titulo) return NextResponse.json({ error: 'cursoId y titulo requeridos' }, { status: 400 })
                const orden = await db.bloqueTematico.count({ where: { cursoId: body.cursoId } })
                const bloque = await db.bloqueTematico.create({
                    data: {
                        cursoId: body.cursoId,
                        codigo: body.codigo || null,
                        titulo: body.titulo,
                        objetivos: body.objetivos || null,
                        descripcion: body.descripcion || null,
                        horas: Number(body.horas) || 0,
                        horasPracticas: Number(body.horasPracticas) || 0,
                        orden,
                    },
                })
                await registrarAudit({ accion: 'CREATE', entidad: 'BloqueTematico', entidadId: bloque.id, descripcion: `Bloque "${bloque.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ bloque })
            }

            case 'leccion': {
                if (!body.bloqueId || !body.titulo) return NextResponse.json({ error: 'bloqueId y titulo requeridos' }, { status: 400 })
                const orden = await db.leccion.count({ where: { bloqueId: body.bloqueId } })
                const leccion = await db.leccion.create({
                    data: {
                        bloqueId: body.bloqueId,
                        titulo: body.titulo,
                        tipo: body.tipoLeccion || 'contenido',
                        contenidoHtml: body.contenidoHtml || null,
                        duracionMin: body.duracionMin != null && body.duracionMin !== '' ? Number(body.duracionMin) : null,
                        obligatoria: body.obligatoria !== false,
                        orden,
                    },
                })
                await registrarAudit({ accion: 'CREATE', entidad: 'Leccion', entidadId: leccion.id, descripcion: `Lección "${leccion.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ leccion })
            }

            case 'recurso': {
                if (!body.leccionId || !body.titulo || !body.url) return NextResponse.json({ error: 'leccionId, titulo y url requeridos' }, { status: 400 })
                const orden = await db.recursoDidactico.count({ where: { leccionId: body.leccionId } })
                const recurso = await db.recursoDidactico.create({
                    data: {
                        leccionId: body.leccionId,
                        tipo: body.tipoRecurso || 'enlace',
                        titulo: body.titulo,
                        url: body.url,
                        orden,
                    },
                })
                await registrarAudit({ accion: 'CREATE', entidad: 'RecursoDidactico', entidadId: recurso.id, descripcion: `Recurso "${recurso.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ recurso })
            }

            case 'plantilla-espa': {
                if (!body.cursoId) return NextResponse.json({ error: 'cursoId requerido' }, { status: 400 })
                const existentes = await db.bloqueTematico.count({ where: { cursoId: body.cursoId } })
                if (existentes > 0 && !body.forzar) {
                    return NextResponse.json({ error: 'El curso ya tiene bloques. Confirma para añadir la plantilla igualmente.', requiereConfirmacion: true }, { status: 409 })
                }
                const creados = await db.$transaction(
                    PLANTILLA_ESPA_BASICO.map((b, i) =>
                        db.bloqueTematico.create({
                            data: {
                                cursoId: body.cursoId,
                                codigo: b.codigo,
                                titulo: b.titulo,
                                horas: b.horas,
                                horasPracticas: b.horasPracticas,
                                orden: existentes + i,
                            },
                        })
                    )
                )
                await registrarAudit({ accion: 'CREATE', entidad: 'BloqueTematico', entidadId: body.cursoId, descripcion: `Plantilla ESPA (curso básico): ${creados.length} bloques`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ creados: creados.length })
            }

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (e: any) {
        console.error('[curriculo][POST]', e)
        return NextResponse.json({ error: 'Error al crear el elemento' }, { status: 500 })
    }
}

// ============================================================
// PUT /api/formacion/curriculo
// body.tipo: 'bloque' | 'leccion' | 'recurso' | 'reordenar-bloques'
// ============================================================
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!(await puedeGestionarFormacion(session))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

        const body = await request.json()
        const tipo = body.tipo
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        switch (tipo) {
            case 'bloque': {
                if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
                const bloque = await db.bloqueTematico.update({
                    where: { id: body.id },
                    data: {
                        codigo: body.codigo ?? undefined,
                        titulo: body.titulo ?? undefined,
                        objetivos: body.objetivos ?? undefined,
                        descripcion: body.descripcion ?? undefined,
                        horas: body.horas != null && body.horas !== '' ? Number(body.horas) : undefined,
                        horasPracticas: body.horasPracticas != null && body.horasPracticas !== '' ? Number(body.horasPracticas) : undefined,
                        orden: body.orden != null ? Number(body.orden) : undefined,
                    },
                })
                await registrarAudit({ accion: 'UPDATE', entidad: 'BloqueTematico', entidadId: bloque.id, descripcion: `Bloque "${bloque.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ bloque })
            }

            case 'leccion': {
                if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
                const leccion = await db.leccion.update({
                    where: { id: body.id },
                    data: {
                        titulo: body.titulo ?? undefined,
                        tipo: body.tipoLeccion ?? undefined,
                        contenidoHtml: body.contenidoHtml ?? undefined,
                        duracionMin: body.duracionMin != null && body.duracionMin !== '' ? Number(body.duracionMin) : undefined,
                        obligatoria: body.obligatoria ?? undefined,
                        orden: body.orden != null ? Number(body.orden) : undefined,
                    },
                })
                await registrarAudit({ accion: 'UPDATE', entidad: 'Leccion', entidadId: leccion.id, descripcion: `Lección "${leccion.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ leccion })
            }

            case 'recurso': {
                if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
                const recurso = await db.recursoDidactico.update({
                    where: { id: body.id },
                    data: {
                        tipo: body.tipoRecurso ?? undefined,
                        titulo: body.titulo ?? undefined,
                        url: body.url ?? undefined,
                        orden: body.orden != null ? Number(body.orden) : undefined,
                    },
                })
                await registrarAudit({ accion: 'UPDATE', entidad: 'RecursoDidactico', entidadId: recurso.id, descripcion: `Recurso "${recurso.titulo}"`, usuarioId, usuarioNombre, modulo: 'formacion' })
                return NextResponse.json({ recurso })
            }

            case 'reordenar-bloques': {
                const items = body.items as Array<{ id: string; orden: number }>
                if (!Array.isArray(items)) return NextResponse.json({ error: 'items requerido' }, { status: 400 })
                await db.$transaction(items.map((it) => db.bloqueTematico.update({ where: { id: it.id }, data: { orden: Number(it.orden) } })))
                return NextResponse.json({ ok: true })
            }

            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
    } catch (e: any) {
        console.error('[curriculo][PUT]', e)
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
}

// ============================================================
// DELETE /api/formacion/curriculo?tipo=bloque|leccion|recurso&id=XXX
// ============================================================
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        if (!(await puedeGestionarFormacion(session))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo')
        const id = searchParams.get('id')
        if (!tipo || !id) return NextResponse.json({ error: 'tipo e id requeridos' }, { status: 400 })
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

        switch (tipo) {
            case 'bloque':
                await db.bloqueTematico.delete({ where: { id } })
                break
            case 'leccion':
                await db.leccion.delete({ where: { id } })
                break
            case 'recurso':
                await db.recursoDidactico.delete({ where: { id } })
                break
            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
        }
        await registrarAudit({ accion: 'DELETE', entidad: tipo, entidadId: id, descripcion: `Eliminado ${tipo} del currículo`, usuarioId, usuarioNombre, modulo: 'formacion' })
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        console.error('[curriculo][DELETE]', e)
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    }
}
