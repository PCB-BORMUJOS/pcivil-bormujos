import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

function getHoraActual(): string {
  return new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })
}

function getHoraTurno(): string {
  const h = parseInt(new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit' }))
  if (h >= 7 && h < 15) return 'mañana'
  if (h >= 15 && h < 23) return 'tarde'
  return 'noche'
}

async function generarNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.incidenciaCecopal.count({ where: { numero: { startsWith: `CEC-${year}` } } })
  return `CEC-${year}-${String(count + 1).padStart(4, '0')}`
}

// Rango UTC [inicio, fin) del día natural de Madrid que contiene "ahora".
// Necesario porque createdAt es un instante: usar medianoche UTC dejaba fuera
// lo registrado en las primeras horas del día en Madrid (UTC+1/+2).
function rangoDiaMadrid(): { inicio: Date; fin: Date } {
  const ahora = new Date()
  const hoyStr = ahora.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) // YYYY-MM-DD en Madrid
  const offMs =
    new Date(ahora.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).getTime() -
    new Date(ahora.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  const inicio = new Date(new Date(hoyStr + 'T00:00:00Z').getTime() - offMs)
  return { inicio, fin: new Date(inicio.getTime() + 86400000) }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  try {
    if (tipo === 'novedades-hoy') {
      // Si se pasa "desde" (inicio del servicio), se recogen las novedades desde
      // ese instante hasta ahora: así un servicio que empieza a las 20:00 y se
      // prolonga hasta la madrugada incluye TODAS sus novedades aunque cruce la
      // medianoche. Sin "desde", se usa el día natural de Madrid.
      const desde = searchParams.get('desde')
      const rango = rangoDiaMadrid()
      const createdAtWhere = desde
        ? { gte: new Date(desde) }
        : { gte: rango.inicio, lt: rango.fin }
      const novedades = await prisma.incidenciaCecopal.findMany({
        where: { estado: 'novedad', createdAt: createdAtWhere },
        orderBy: { createdAt: 'asc' },
        select: { id: true, descripcion: true, horaLlamada: true, createdAt: true }
      })
      return NextResponse.json({ novedades })
    }

    if (tipo === 'turno-hoy') {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const turno = getHoraTurno()
      const guardias = await prisma.guardia.findMany({
        where: {
          fecha: { gte: new Date(hoy), lt: new Date(new Date(hoy).getTime() + 86400000) },
          turno,
          estado: { not: 'cancelada' }
        },
        include: { usuario: { select: { id: true, nombre: true, apellidos: true, telefono: true, numeroVoluntario: true } } },
        orderBy: { rol: 'asc' }
      })
      return NextResponse.json({ guardias, turno, fecha: hoy })
    }
    if (tipo === 'vehiculos-disponibles') {
      const vehiculos = await prisma.vehiculo.findMany({
        where: { estado: 'disponible' },
        select: { id: true, indicativo: true, matricula: true, marca: true, modelo: true, tipo: true, estado: true }
      })
      return NextResponse.json({ vehiculos })
    }
    if (tipo === 'incidencia-id') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      const incidencia = await prisma.incidenciaCecopal.findUnique({ where: { id } })
      return NextResponse.json({ incidencia })
    }

    if (tipo === 'incidencia-activa') {
      const incidencia = await prisma.incidenciaCecopal.findFirst({
        where: { estado: 'activa' },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'incidencias-activas') {
      // Todas las incidencias activas (permite gestionar varias en paralelo).
      const incidencias = await prisma.incidenciaCecopal.findMany({
        where: { estado: 'activa' },
        orderBy: { createdAt: 'asc' }
      })
      return NextResponse.json({ incidencias })
    }
    if (tipo === 'historial') {
      const incidencias = await prisma.incidenciaCecopal.findMany({
        where: { estado: { not: 'activa' } },
        include: { operador: { select: { nombre: true, apellidos: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      return NextResponse.json({ incidencias })
    }
    if (tipo === 'alertas') {
      const hoy = new Date()
      const en30dias = new Date(hoy.getTime() + 30 * 86400000)
      const [botiquines, deas, vehiculos] = await Promise.all([
        prisma.botiquin.findMany({
          where: { OR: [{ proximaRevision: { lte: hoy } }, { estado: { not: 'operativo' } }] },
          select: { id: true, nombre: true, estado: true, proximaRevision: true }
        }),
        prisma.dEA.findMany({
          where: { OR: [{ caducidadBateria: { lte: en30dias } }, { caducidadParches: { lte: en30dias } }, { caducidadPilas: { lte: en30dias } }, { estado: { not: 'operativo' } }] },
          select: { id: true, codigo: true, ubicacion: true, estado: true, caducidadBateria: true, caducidadParches: true, caducidadPilas: true }
        }),
        prisma.vehiculo.findMany({
          where: { OR: [{ fechaItv: { lte: en30dias } }, { fechaSeguro: { lte: en30dias } }] },
          select: { id: true, indicativo: true, matricula: true, fechaItv: true, fechaSeguro: true }
        })
      ])
      return NextResponse.json({ botiquines, deas, vehiculos })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error GET /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { tipo } = body
    if (tipo === 'incidencia') {
      const numero = await generarNumero()
      const incidencia = await prisma.incidenciaCecopal.create({
        data: {
          numero,
          estado: 'activa',
          tipoIncidencia: body.tipoIncidencia,
          origenAviso: body.origenAviso,
          direccion: body.direccion,
          descripcion: body.descripcion || null,
          horaLlamada: body.horaLlamada || getHoraActual(),
          vehiculosIds: body.vehiculosIds || [],
          voluntariosIds: body.voluntariosIds || [],
          operadorId: (session.user as any).id
        }
      })
      const _auditCec = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'IncidenciaCecopal', entidadId: incidencia.id, descripcion: `Incidencia activada: ${incidencia.numero} — ${incidencia.tipoIncidencia} en ${incidencia.direccion}`, usuarioId: _auditCec.usuarioId, usuarioNombre: _auditCec.usuarioNombre, modulo: 'CECOPAL' })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'novedad-turno') {
      const numero = await generarNumero()
      const novedad = await prisma.incidenciaCecopal.create({
        data: {
          numero,
          estado: 'novedad',
          tipoIncidencia: 'novedad',
          origenAviso: 'interno',
          direccion: '-',
          descripcion: body.texto,
          horaLlamada: getHoraActual(),
          operadorId: (session.user as any).id
        }
      })
      const _auditNov = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'NovedadTurno', entidadId: novedad.id, descripcion: `Novedad de turno registrada: ${novedad.numero}`, usuarioId: _auditNov.usuarioId, usuarioNombre: _auditNov.usuarioNombre, modulo: 'CECOPAL' })
      return NextResponse.json({ novedad })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error POST /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, tipo } = body
    if (tipo === 'isocrona') {
      const incidencia = await prisma.incidenciaCecopal.update({
        where: { id },
        data: { [body.campo]: body.valor }
      })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'resolver') {
      const incidencia = await prisma.incidenciaCecopal.update({
        where: { id },
        data: {
          estado: 'resuelta',
          horaDisponible: body.horaDisponible || getHoraActual(),
          observaciones: body.observaciones || null,
          parteId: body.parteId || null
        }
      })
      const _auditRes = getUsuarioAudit(session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'IncidenciaCecopal', entidadId: incidencia.id, descripcion: `Incidencia resuelta: ${incidencia.numero}${incidencia.horaDisponible ? ' — disponible: ' + incidencia.horaDisponible : ''}`, usuarioId: _auditRes.usuarioId, usuarioNombre: _auditRes.usuarioNombre, modulo: 'CECOPAL' })
      return NextResponse.json({ incidencia })
    }
    if (tipo === 'actualizar') {
      // Solo se actualizan los campos presentes en el cuerpo (undefined = no
      // tocar), para no borrar datos al guardar una edición parcial.
      const data: any = {}
      const campos = [
        'tipoIncidencia', 'origenAviso', 'direccion', 'descripcion', 'observaciones',
        'vehiculosIds', 'voluntariosIds', 'horaLlamada', 'horaSalida', 'horaLlegada',
        'horaTerminado', 'horaDisponible',
      ]
      campos.forEach(c => { if (body[c] !== undefined) data[c] = body[c] })
      const incidencia = await prisma.incidenciaCecopal.update({ where: { id }, data })
      const _auditAct = getUsuarioAudit(session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'IncidenciaCecopal', entidadId: incidencia.id, descripcion: `Incidencia actualizada: ${incidencia.numero}`, usuarioId: _auditAct.usuarioId, usuarioNombre: _auditAct.usuarioNombre, modulo: 'CECOPAL' })
      return NextResponse.json({ incidencia })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error PUT /api/cecopal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
