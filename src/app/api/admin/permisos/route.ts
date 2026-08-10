import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

function esSuperadmin(session: any) {
  return (session?.user as any)?.rol === 'superadmin'
}

// GET: lista de usuarios con su configuración de permisos por módulo (superadmin).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!esSuperadmin(session)) return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 })

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: {
      id: true, nombre: true, apellidos: true, numeroVoluntario: true,
      permisosPersonalizados: true, permisosExtra: true,
      rol: { select: { nombre: true } },
    },
    orderBy: [{ nombre: 'asc' }],
  })
  return NextResponse.json({ usuarios })
}

// PUT: actualiza los permisos personalizados de un usuario (superadmin).
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!esSuperadmin(session)) return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 })

  try {
    const { usuarioId, permisosPersonalizados, permisosExtra } = await request.json()
    if (!usuarioId) return NextResponse.json({ error: 'Falta usuarioId' }, { status: 400 })

    // Se preservan las claves de permiso "legacy" (no ver:/editar:) que pudiera
    // tener el usuario, y se sustituyen únicamente las de módulo.
    const actual = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { permisosExtra: true } })
    const legacy = (((actual?.permisosExtra as string[]) || [])).filter(k => !k.startsWith('ver:') && !k.startsWith('editar:'))
    const modulos = (Array.isArray(permisosExtra) ? permisosExtra : []).filter((k: string) => k.startsWith('ver:') || k.startsWith('editar:'))
    const nuevaLista = Array.from(new Set([...legacy, ...modulos]))

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        permisosPersonalizados: !!permisosPersonalizados,
        permisosExtra: nuevaLista,
      },
      select: { id: true, nombre: true, apellidos: true, permisosPersonalizados: true, permisosExtra: true },
    })

    const { usuarioId: adminId, usuarioNombre: adminNombre } = getUsuarioAudit(session)
    await registrarAudit({
      accion: 'UPDATE', entidad: 'Usuario', entidadId: usuario.id,
      descripcion: `Permisos personalizados ${usuario.permisosPersonalizados ? 'activados' : 'desactivados'} para ${usuario.nombre} ${usuario.apellidos} (${(usuario.permisosExtra as string[]).filter(k => k.startsWith('ver:')).length} módulos visibles)`,
      usuarioId: adminId, usuarioNombre: adminNombre, modulo: 'Configuración',
    })

    return NextResponse.json({ ok: true, usuario })
  } catch (error) {
    console.error('Error PUT /api/admin/permisos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
