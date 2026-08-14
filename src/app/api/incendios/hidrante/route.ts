import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

// CRUD de hidrantes bajo el módulo INCENDIOS (antes vivía en /api/logistica, que
// se controla por otro módulo). Así, quien tenga permiso de VER/EDITAR incendios
// gestiona los hidrantes: el middleware ya exige ver:/editar:incendios para
// /api/incendios/*, y aquí se acepta además el permiso personalizado editar:incendios.

const isValid = (v: any) => v !== undefined && v !== null && v !== ''
const NIVEL: Record<string, number> = { superadmin: 4, admin: 3, coordinador: 2, voluntario: 1 }

async function sesion() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { session: null as any, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  return { session, error: null }
}

// ¿Puede escribir hidrantes? Rol coordinador+ o el permiso personalizado
// editar:incendios (o el permiso legacy de inventario).
function puedeEditar(session: any): boolean {
  const rol = (session.user as any).rol as string ?? 'voluntario'
  const extra: string[] = (session.user as any).permisosExtra ?? []
  const rolPerms: string[] = (session.user as any).permisos ?? []
  const todos = new Set([...rolPerms, ...extra])
  const nivel = NIVEL[rol] ?? 1
  return nivel >= 2
    || extra.includes('editar:incendios')
    || todos.has('inventario.crear') || todos.has('inventario.editar')
}

// GET: lista de hidrantes + estadísticas (el middleware ya exige ver:incendios).
export async function GET() {
  const { session, error } = await sesion()
  if (error) return error
  void session
  const hidrantes = await prisma.hidrante.findMany({ orderBy: { codigo: 'asc' } })
  return NextResponse.json({
    hidrantes,
    stats: { total: hidrantes.length, operativos: hidrantes.filter(h => h.estado === 'operativo').length },
  })
}

// POST: crear hidrante.
export async function POST(request: NextRequest) {
  const { session, error } = await sesion()
  if (error) return error
  if (!puedeEditar(session)) return NextResponse.json({ error: 'Sin permiso para crear hidrantes' }, { status: 403 })

  const body = await request.json()
  const { codigo, tipoHidrante, ubicacion, latitud, longitud, presion, caudal, estado, fotoUbicacion, fotoDetalle } = body
  if (!codigo || !ubicacion) return NextResponse.json({ error: 'Código y ubicación son requeridos' }, { status: 400 })

  const hidrante = await prisma.hidrante.create({
    data: {
      codigo,
      tipo: tipoHidrante || 'columna',
      ubicacion,
      latitud: isValid(latitud) ? parseFloat(latitud) : null,
      longitud: isValid(longitud) ? parseFloat(longitud) : null,
      presion: isValid(presion) ? parseFloat(presion) : null,
      caudal: isValid(caudal) ? parseFloat(caudal) : null,
      fotoUbicacion: fotoUbicacion || null,
      fotoDetalle: fotoDetalle || null,
      estado: estado || 'operativo',
    },
  })

  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
  await registrarAudit({ accion: 'CREATE', entidad: 'Hidrante', entidadId: hidrante.id, descripcion: `Hidrante registrado: ${hidrante.codigo} en ${hidrante.ubicacion}`, usuarioId, usuarioNombre, modulo: 'Incendios' })
  return NextResponse.json({ success: true, hidrante })
}

// PUT: editar hidrante.
export async function PUT(request: NextRequest) {
  const { session, error } = await sesion()
  if (error) return error
  if (!puedeEditar(session)) return NextResponse.json({ error: 'Sin permiso para editar hidrantes' }, { status: 403 })

  const body = await request.json()
  const { id, codigo, tipoHidrante, ubicacion, latitud, longitud, presion, caudal, estado, fotoUbicacion, fotoDetalle } = body
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const hidrante = await prisma.hidrante.update({
    where: { id },
    data: {
      codigo,
      tipo: tipoHidrante,
      ubicacion,
      latitud: isValid(latitud) ? parseFloat(latitud) : null,
      longitud: isValid(longitud) ? parseFloat(longitud) : null,
      presion: isValid(presion) ? parseFloat(presion) : null,
      caudal: isValid(caudal) ? parseFloat(caudal) : null,
      ...(fotoUbicacion !== undefined ? { fotoUbicacion: fotoUbicacion || null } : {}),
      ...(fotoDetalle !== undefined ? { fotoDetalle: fotoDetalle || null } : {}),
      estado,
    },
  })

  const detalles: string[] = []
  if (isValid(caudal)) detalles.push(`caudal: ${caudal} m³/h`)
  if (isValid(presion)) detalles.push(`presión: ${presion} bar`)
  if (estado) detalles.push(`estado: ${estado}`)
  if (ubicacion) detalles.push(`ubicación: ${ubicacion}`)

  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
  await registrarAudit({ accion: 'UPDATE', entidad: 'Hidrante', entidadId: hidrante.id, descripcion: `Hidrante actualizado: ${hidrante.codigo}${detalles.length ? ' — ' + detalles.join(', ') : ''}`, usuarioId, usuarioNombre, modulo: 'Incendios' })
  return NextResponse.json({ success: true, hidrante })
}

// DELETE: eliminar hidrante (?id=...).
export async function DELETE(request: NextRequest) {
  const { session, error } = await sesion()
  if (error) return error
  if (!puedeEditar(session)) return NextResponse.json({ error: 'Sin permiso para eliminar hidrantes' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  await prisma.hidrante.delete({ where: { id } })

  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
  await registrarAudit({ accion: 'DELETE', entidad: 'Hidrante', entidadId: id, descripcion: 'Hidrante eliminado', usuarioId, usuarioNombre, modulo: 'Incendios' })
  return NextResponse.json({ success: true })
}
