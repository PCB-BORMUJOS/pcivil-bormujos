import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

// Calcula horas reales entre dos strings "HH:MM"
function calcularHoras(horaInicio: string, horaFin: string): number {
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFin.split(':').map(Number)
  const minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  return Math.max(0, minutos / 60)
}

async function getBaremo() {
  const [configBaremo, configKm] = await Promise.all([
    prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
    prisma.configuracion.findUnique({ where: { clave: 'precio_km' } })
  ])
  const BAREMO_DEFAULT = [
    { minHours: 4, amount: 29.45 },
    { minHours: 8, amount: 49.15 },
    { minHours: 12, amount: 72.37 }
  ]
  const rawBaremo = configBaremo?.valor
  const baremo: any[] = rawBaremo
    ? (typeof rawBaremo === 'string' ? JSON.parse(rawBaremo) : rawBaremo as any[])
    : BAREMO_DEFAULT
  const rawKm = configKm?.valor
  const precioKm: number = rawKm
    ? ((typeof rawKm === 'string' ? JSON.parse(rawKm) : rawKm as any)?.precio ?? 0.19)
    : 0.19
  return { baremo, precioKm }
}

function calcularImporteDieta(horas: number, baremo: any[]): number {
  const tramo = [...baremo].reverse().find(t => horas >= (t.minHours ?? t.horasMin ?? 0))
  return tramo?.amount ?? tramo?.importe ?? 0
}

// POST — añadir participante al evento y generar dieta
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email }, include: { rol: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']
    if (!rolesPermitidos.includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }

    const { usuarioId, rol, notas } = await request.json()
    if (!usuarioId) return NextResponse.json({ error: 'usuarioId requerido' }, { status: 400 })

    const evento = await prisma.evento.findUnique({ where: { id: params.id } })
    if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    // Verificar que no está ya asignado
    const existente = await prisma.eventoParticipante.findFirst({
      where: { eventoId: params.id, usuarioId }
    })
    if (existente) return NextResponse.json({ error: 'El voluntario ya está asignado a este evento' }, { status: 400 })

    // Crear participante
    const participante = await prisma.eventoParticipante.create({
      data: { eventoId: params.id, usuarioId, rol: rol || null, notas: notas || null, estado: 'asignado' },
      include: { usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } } }
    })

    // Calcular dieta del evento
    try {
      const { baremo, precioKm } = await getBaremo()
      const horas = evento.horaFin ? calcularHoras(evento.horaInicio, evento.horaFin) : 5
      const importeDia = calcularImporteDieta(horas, baremo)
      const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } })
      const kmIda = Number(ficha?.kmDesplazamiento ?? 0)
      const kilometros = kmIda * 2
      const subtotalKm = parseFloat((kilometros * precioKm).toFixed(2))
      const totalDieta = parseFloat((importeDia + subtotalKm).toFixed(2))
      const mesAnio = evento.fecha.toISOString().slice(0, 7)
      const fechaEvento = evento.fecha

      // REGLA SOLAPAMIENTO: si tiene guardia normal ese día, eliminar sus dietas normales
      const guardiasMismoDia = await prisma.guardia.findMany({
        where: { usuarioId, fecha: fechaEvento }
      })
      if (guardiasMismoDia.length > 0) {
        const guardiaIds = guardiasMismoDia.map(g => g.id)
        await prisma.dieta.deleteMany({
          where: { usuarioId, guardiaId: { in: guardiaIds } }
        })
      }

      // Crear dieta del evento (eventoId como referencia en turno)
      await prisma.dieta.create({
        data: {
          usuarioId,
          guardiaId: null,
          fecha: fechaEvento,
          turno: `evento:${params.id}`,
          horasTrabajadas: horas,
          importeDia,
          subtotalDietas: importeDia,
          kilometros,
          importeKm: precioKm,
          subtotalKm,
          totalDieta,
          mesAnio,
          estado: 'pendiente'
        }
      })
    } catch (dietaError) {
      console.error('Error generando dieta de evento:', dietaError)
    }

    const { usuarioId: adminId, usuarioNombre: adminNombre } = getUsuarioAudit(session)
    await registrarAudit({
      accion: 'CREATE',
      entidad: 'EventoParticipante',
      entidadId: participante.id,
      descripcion: `Voluntario añadido al evento: ${evento.titulo}`,
      usuarioId: adminId,
      usuarioNombre: adminNombre,
      modulo: 'Operativa'
    })

    return NextResponse.json({ success: true, participante })
  } catch (error) {
    console.error('Error añadiendo participante:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE — quitar participante y restaurar dieta de guardia normal si existía
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email }, include: { rol: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const rolesPermitidos = ['superadmin', 'admin', 'coordinador']
    if (!rolesPermitidos.includes(usuario.rol.nombre)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuarioId')
    if (!usuarioId) return NextResponse.json({ error: 'usuarioId requerido' }, { status: 400 })

    const evento = await prisma.evento.findUnique({ where: { id: params.id } })
    if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    // Eliminar participante
    await prisma.eventoParticipante.deleteMany({ where: { eventoId: params.id, usuarioId } })

    // Eliminar dieta del evento
    await prisma.dieta.deleteMany({
      where: { usuarioId, turno: `evento:${params.id}` }
    })

    // RESTAURAR dietas de guardias normales ese día si existen
    try {
      const { baremo, precioKm } = await getBaremo()
      const HORAS_TURNO: Record<string, number> = { 'mañana': 5.5, 'tarde': 5, 'noche': 9 }
      const guardiasMismoDia = await prisma.guardia.findMany({
        where: { usuarioId, fecha: evento.fecha },
        include: { usuario: { include: { fichaVoluntario: true } } }
      })
      for (const guardia of guardiasMismoDia) {
        const dietaExistente = await prisma.dieta.findFirst({ where: { guardiaId: guardia.id } })
        if (!dietaExistente) {
          const horasTrabajadas = HORAS_TURNO[guardia.turno.toLowerCase()] ?? 5
          const tramo = [...baremo].reverse().find(t => horasTrabajadas >= (t.minHours ?? t.horasMin ?? 0))
          const importeDia = tramo?.amount ?? tramo?.importe ?? 0
          const kmIda = Number(guardia.usuario?.fichaVoluntario?.kmDesplazamiento ?? 0)
          const kilometros = kmIda * 2
          const subtotalKm = parseFloat((kilometros * precioKm).toFixed(2))
          await prisma.dieta.create({
            data: {
              usuarioId,
              guardiaId: guardia.id,
              fecha: guardia.fecha,
              turno: guardia.turno,
              horasTrabajadas,
              importeDia,
              subtotalDietas: importeDia,
              kilometros,
              importeKm: precioKm,
              subtotalKm,
              totalDieta: parseFloat((importeDia + subtotalKm).toFixed(2)),
              mesAnio: guardia.fecha.toISOString().slice(0, 7),
              estado: 'pendiente'
            }
          })
        }
      }
    } catch (restoreError) {
      console.error('Error restaurando dietas:', restoreError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando participante:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
