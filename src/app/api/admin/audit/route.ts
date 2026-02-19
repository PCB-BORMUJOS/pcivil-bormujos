import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Tipos de acciones registradas
const TIPOS_ACCION = [
    'CREATE',      // Creación de registros
    'UPDATE',      // Actualización de registros
    'DELETE',      // Eliminación de registros
    'LOGIN',       // Inicio de sesión
    'LOGOUT',      // Cierre de sesión
    'EXPORT',      // Exportación de datos
    'IMPORT',      // Importación de datos
    'VIEW',        // Visualización de datos
    'APPROVE',     // Aprobación
    'REJECT',      // Rechazo
    'ASSIGN',      // Asignación
    'UNASSIGN',    // Desasignación
    'ACTIVATE',    // Activación
    'DEACTIVATE',  // Desactivación
    'UPLOAD',      // Subida de archivos
    'DOWNLOAD',    // Descarga de archivos
] as const

type TipoAccion = typeof TIPOS_ACCION[number]

// Entidades registradas
const ENTIDADES = [
    'Usuario',
    'Voluntario',
    'Personal',
    'Evento',
    'Guardia',
    'Disponibilidad',
    'Caja',
    'Combustible',
    'Póliza',
    'Dieta',
    'Inventario',
    'Vehículo',
    'Mensaje',
    'Notificación',
    'Aspirante',
    'Configuración',
    'PartePSI',
    'PartePAS',
    'PartePOT',
    'PartePRD',
    'PartePRH',
    'PartePRC',
    'Formación',
    'Logística',
    'Transmisión',
    'Otro',
] as const

type Entidad = typeof ENTIDADES[number]

// Módulos del sistema
const MODULOS = [
    'Administración',
    'Personal',
    'Incendios',
    'Socorrismo',
    'Formación',
    'Logística',
    'Vehículos',
    'Inventario',
    'Transmisiones',
    'Partes',
    'Configuración',
    'Otro',
] as const

type Modulo = typeof MODULOS[number]

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)

        // Filtros
        const accion = searchParams.get('accion')
        const entidad = searchParams.get('entidad')
        const entidadId = searchParams.get('entidadId')
        const usuarioId = searchParams.get('usuarioId')
        const modulo = searchParams.get('modulo')
        const fechaInicio = searchParams.get('fechaInicio')
        const fechaFin = searchParams.get('fechaFin')
        const busqueda = searchParams.get('busqueda')
        const pagina = parseInt(searchParams.get('pagina') || '1')
        const limite = parseInt(searchParams.get('limite') || '50')

        // Construir filtros
        const where: any = {}

        if (accion) where.accion = accion
        if (entidad) where.entidad = entidad
        if (entidadId) where.entidadId = entidadId
        if (usuarioId) where.usuarioId = usuarioId
        if (modulo) where.modulo = modulo

        // Filtro por rango de fechas
        if (fechaInicio || fechaFin) {
            where.createdAt = {}
            if (fechaInicio) where.createdAt.gte = new Date(fechaInicio)
            if (fechaFin) where.createdAt.lte = new Date(fechaFin + 'T23:59:59')
        }

        // Búsqueda en descripción
        if (busqueda) {
            where.OR = [
                { descripcion: { contains: busqueda, mode: 'insensitive' } },
                { usuarioNombre: { contains: busqueda, mode: 'insensitive' } },
                { usuarioEmail: { contains: busqueda, mode: 'insensitive' } },
            ]
        }

        // Obtener total de registros
        const total = await prisma.auditLog.count({ where })

        // Obtener logs con paginación
        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (pagina - 1) * limite,
            take: limite,
        })

        // Obtener estadísticas para filtros
        const stats = await Promise.all([
            prisma.auditLog.groupBy({
                by: ['accion'],
                _count: { accion: true },
                orderBy: { _count: { accion: 'desc' } },
            }),
            prisma.auditLog.groupBy({
                by: ['entidad'],
                _count: { entidad: true },
                orderBy: { _count: { entidad: 'desc' } },
            }),
            prisma.auditLog.groupBy({
                by: ['modulo'],
                _count: { modulo: true },
                orderBy: { _count: { modulo: 'desc' } },
            }),
        ])

        return NextResponse.json({
            logs,
            paginacion: {
                total,
                pagina,
                limite,
                totalPaginas: Math.ceil(total / limite),
            },
            filtros: {
                acciones: stats[0].map(s => ({ accion: s.accion, cantidad: s._count.accion })),
                entidades: stats[1].map(s => ({ entidad: s.entidad, cantidad: s._count.entidad })),
                modulos: stats[2].map(s => ({ modulo: s.modulo, cantidad: s._count.modulo })),
            },
            opciones: {
                acciones: TIPOS_ACCION,
                entidades: ENTIDADES,
                modulos: MODULOS,
            },
        })
    } catch (error) {
        console.error('Error al obtener logs de auditoría:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { accion, entidad, entidadId, datosAnteriores, datosNuevos, descripcion, modulo } = body

        if (!accion || !entidad) {
            return NextResponse.json({ error: 'Acción y entidad son requeridos' }, { status: 400 })
        }

        // Validar tipo de acción
        if (!TIPOS_ACCION.includes(accion)) {
            return NextResponse.json({ error: 'Tipo de acción inválido' }, { status: 400 })
        }

        // Obtener información del usuario
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
            include: { rol: true },
        })

        // Extraer IP y User-Agent de la request
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        const log = await prisma.auditLog.create({
            data: {
                accion,
                entidad,
                entidadId,
                datosAnteriores: datosAnteriores || undefined,
                datosNuevos: datosNuevos || undefined,
                usuarioId: usuario?.id || null,
                usuarioEmail: session.user.email,
                usuarioNombre: usuario ? `${usuario.nombre} ${usuario.apellidos}`.trim() : null,
                ip,
                userAgent,
                descripcion,
                modulo,
            },
        })

        return NextResponse.json({ success: true, log })
    } catch (error) {
        console.error('Error al crear log de auditoría:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
