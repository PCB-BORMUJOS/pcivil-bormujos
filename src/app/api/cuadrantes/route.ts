import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { safeJsonParse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')
    const incluirDisponibilidades = searchParams.get('incluirDisponibilidades') === 'true'
    if (!semana) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 })
    }
    const inicioSemana = new Date(semana + 'T00:00:00.000Z')
    const finSemana = new Date(semana + 'T00:00:00.000Z')
    finSemana.setDate(finSemana.getDate() + 6)
    finSemana.setHours(23, 59, 59, 999)
    const guardias = await prisma.guardia.findMany({
      where: { fecha: { gte: inicioSemana, lte: finSemana } },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, apellidos: true, numeroVoluntario: true,
            email: true, responsableTurno: true, carnetConducir: true, esOperativo: true,
            fichaVoluntario: { select: { enPracticas: true, turnosPracticasRealizados: true } },
          }
        }
      },
      orderBy: [{ fecha: 'asc' }, { turno: 'asc' }]
    })
    // horaInicio y horaFin ya se incluyen en el select completo de guardia
    if (!incluirDisponibilidades) {
      return NextResponse.json({ guardias })
    }
    const semanaStart = new Date(semana + 'T00:00:00.000Z')
    const semanaEnd = new Date(semana + 'T23:59:59.999Z')
    // Disponibilidades con al menos 1 turno declarado
    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: { gte: semanaStart, lte: semanaEnd },
        noDisponible: false
      },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, apellidos: true, numeroVoluntario: true,
            responsableTurno: true, carnetConducir: true, experiencia: true,
            nivelCompromiso: true, esOperativo: true,
            fichaVoluntario: { select: { enPracticas: true, turnosPracticasRealizados: true } },
          }
        }
      }
    })

    // IDs que han declarado explícitamente no estar disponibles esta semana
    const noDisponiblesRegistros = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: { gte: semanaStart, lte: semanaEnd },
        noDisponible: true
      },
      select: { usuarioId: true }
    })
    const idsNoDisponible = noDisponiblesRegistros.map(r => r.usuarioId)

    // IDs que han respondido ALGO esta semana (con o sin disponibilidad)
    const todosRespondieron = await prisma.disponibilidad.findMany({
      where: { semanaInicio: { gte: semanaStart, lte: semanaEnd } },
      select: { usuarioId: true }
    })
    const idsQueRespondieron = Array.from(new Set(todosRespondieron.map(r => r.usuarioId)))
    const todosUsuariosActivos = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true, nombre: true, apellidos: true, numeroVoluntario: true,
        responsableTurno: true, carnetConducir: true, experiencia: true,
        nivelCompromiso: true, esOperativo: true,
        fichaVoluntario: { select: { enPracticas: true, turnosPracticasRealizados: true } }
      },
      orderBy: [{ numeroVoluntario: 'asc' }]
    })
    return NextResponse.json({ guardias, disponibilidades, todosUsuariosActivos, idsNoDisponible, idsQueRespondieron })
  } catch (error) {
    console.error('Error al obtener guardias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos para crear guardias' }, { status: 403 })
    }
    const body = await request.json()
    const { fecha, turno, usuarioId, tipo, notas, servicioId, rol, horasTurno, descripcionExtra } = body
    if (!fecha || !turno || !usuarioId) {
      return NextResponse.json({ error: 'Fecha, turno y usuarioId son requeridos' }, { status: 400 })
    }
    const existente = await prisma.guardia.findFirst({
      where: { usuarioId, fecha: new Date(fecha + 'T12:00:00.000Z'), turno }
    })
    if (existente) {
      return NextResponse.json({ error: 'Ya existe una guardia para este usuario en esta fecha y turno' }, { status: 400 })
    }
    const usuarioAsignado = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    const guardia = await prisma.guardia.create({
      data: {
        fecha: new Date(fecha + 'T12:00:00.000Z'),
        turno, rol: rol || null,
        tipo: tipo || 'programada',
        notas: notas || '',
        horasTurno: horasTurno ? parseFloat(horasTurno) : null,
        descripcionExtra: descripcionExtra || null,
        usuarioId,
        servicioId: servicioId || usuarioAsignado?.servicioId || '',
        estado: 'programada'
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })
    
    // Generar dieta automáticamente al crear guardia
    try {
      // Comprobar si está en prácticas
      const fichaCheck = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } })
      if (fichaCheck?.enPracticas) {
        const TURNOS_OBLIGATORIOS = 15
        // Incremento atómico — evita race condition si dos guardias se crean a la vez
        const fichaActualizada = await prisma.fichaVoluntario.update({
          where: { usuarioId },
          data: { turnosPracticasRealizados: { increment: 1 } }
        })
        const nuevoContador = fichaActualizada.turnosPracticasRealizados ?? 1
        if (nuevoContador >= TURNOS_OBLIGATORIOS) {
          // Ha completado las prácticas → pasar a voluntario
          await prisma.fichaVoluntario.update({
            where: { usuarioId },
            data: { enPracticas: false }
          })
          // Notificar al usuario
          await prisma.notificacion.create({
            data: {
              usuarioId,
              titulo: '¡Prácticas completadas!',
              mensaje: `Has completado los ${TURNOS_OBLIGATORIOS} turnos de prácticas obligatorios. Ya eres voluntario activo.`,
              tipo: 'sistema',
              leida: false
            }
          })
        }
        // NO generar dieta para personas en prácticas
        return NextResponse.json({ success: true, guardia })
      }

      const [configBaremo, configKm] = await Promise.all([
        prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
        prisma.configuracion.findUnique({ where: { clave: 'precio_km' } })
      ]);
      const rawBaremo = configBaremo?.valor;
      const baremo: any[] = rawBaremo
        ? safeJsonParse(rawBaremo, [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }])
        : [{ minHours: 4, amount: 29.45 }, { minHours: 8, amount: 49.15 }, { minHours: 12, amount: 72.37 }];
      const rawKm = configKm?.valor;
      const precioKm: number = rawKm
        ? (safeJsonParse<{ precio?: number }>(rawKm, {})?.precio ?? 0.19)
        : 0.19;
      const horasPorTurno: Record<string, number> = { 'mañana': 5.5, 'tarde': 5, 'noche': 9 };
      const horasTrabajadas = horasTurno ? parseFloat(String(horasTurno)) : (horasPorTurno[turno.toLowerCase()] ?? 5);

      const fechaGuardia = new Date(fecha + 'T12:00:00.000Z');
      const inicioDia = new Date(fecha + 'T00:00:00.000Z');
      const finDia = new Date(fecha + 'T23:59:59.999Z');
      const mesAnio = fechaGuardia.toISOString().slice(0, 7);

      // Obtener dietas de otros turnos del mismo día para acumular horas correctamente
      const dietasOtrosTurnos = await prisma.dieta.findMany({
        where: { usuarioId, fecha: { gte: inicioDia, lte: finDia }, turno: { not: turno } },
        select: { id: true, horasTrabajadas: true, turno: true, kilometros: true, subtotalKm: true }
      });
      const horasOtrosTurnos = dietasOtrosTurnos.reduce((sum, d) => sum + Number(d.horasTrabajadas), 0);
      const horasTotalesDia = horasOtrosTurnos + horasTrabajadas;

      // Baremo se calcula sobre el TOTAL del día
      const tramo = [...baremo].reverse().find(t => horasTotalesDia >= (t.horasMin ?? t.minHours ?? 0));
      const importeDia = tramo?.importe ?? tramo?.amount ?? 0;

      const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId } });
      const kmIda = Number(ficha?.kmDesplazamiento ?? 0);
      // Km se cuenta UNA sola vez por día
      const kmYaContado = dietasOtrosTurnos.length > 0;
      const kilometros = kmYaContado ? 0 : kmIda * 2;
      const subtotalKm = Math.round(kilometros * precioKm * 100) / 100;
      const totalDieta = Math.round((importeDia + subtotalKm) * 100) / 100;

      // Si hay otros turnos del mismo día, poner su importeDia a 0 (el baremo acumulado va aquí)
      if (dietasOtrosTurnos.length > 0) {
        const dietaConKm = dietasOtrosTurnos.find(d => Number(d.kilometros) > 0);
        if (dietaConKm) {
          const nuevoTotalAnterior = Math.round(Number(dietaConKm.subtotalKm) * 100) / 100;
          await prisma.dieta.update({
            where: { id: dietaConKm.id },
            data: { importeDia: 0, subtotalDietas: 0, totalDieta: nuevoTotalAnterior }
          });
        }
        await prisma.dieta.updateMany({
          where: { usuarioId, fecha: { gte: inicioDia, lte: finDia }, turno: { not: turno }, kilometros: 0 },
          data: { importeDia: 0, subtotalDietas: 0, totalDieta: 0 }
        });
      }

      // Eliminar dieta previa de este mismo turno si existía (reasignación)
      await prisma.dieta.deleteMany({ where: { usuarioId, fecha: { gte: inicioDia, lte: finDia }, turno } });

      const desglose = [
        ...dietasOtrosTurnos.map(d => `${d.turno}:${d.horasTrabajadas}h`),
        `${turno}:${horasTrabajadas}h`
      ].join(' + ');

      await prisma.dieta.create({
        data: {
          usuarioId,
          guardiaId: guardia.id,
          fecha: fechaGuardia,
          turno,
          horasTrabajadas,
          importeDia,
          subtotalDietas: importeDia,
          kilometros,
          importeKm: precioKm,
          subtotalKm,
          totalDieta,
          mesAnio,
          estado: 'pendiente',
          notas: dietasOtrosTurnos.length > 0
            ? `${horasTotalesDia}h día (${desglose}) - baremo ${importeDia}€`
            : undefined
        }
      });
    } catch (dietaError) {
      console.error('Error generando dieta automática:', dietaError);
      // No bloqueamos la respuesta aunque falle la dieta
    }
    return NextResponse.json({ success: true, guardia })
  } catch (error) {
    console.error('Error al crear guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    const body = await request.json()
    const { id, tipo, notas, estado, rol, horaInicio, horaFin } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Calcular horasTurno automáticamente si se proporcionan hora inicio y fin
    let horasTurnoCalculadas: number | undefined
    if (horaInicio && horaFin) {
      const [hIni, mIni] = horaInicio.split(':').map(Number)
      const [hFin, mFin] = horaFin.split(':').map(Number)
      let minutosIni = hIni * 60 + mIni
      let minutosFin = hFin * 60 + mFin
      // Turno de noche puede cruzar medianoche
      if (minutosFin <= minutosIni) minutosFin += 24 * 60
      horasTurnoCalculadas = Math.round(((minutosFin - minutosIni) / 60) * 100) / 100
    }

    const guardia = await prisma.guardia.update({
      where: { id },
      data: {
        ...(tipo && { tipo }),
        ...(notas !== undefined && { notas }),
        ...(estado && { estado }),
        ...(rol !== undefined && { rol }),
        ...(horaInicio !== undefined && { horaInicio }),
        ...(horaFin !== undefined && { horaFin }),
        ...(horasTurnoCalculadas !== undefined && { horasTurno: horasTurnoCalculadas }),
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true } }
      }
    })
    return NextResponse.json({ success: true, guardia })
  } catch (error) {
    console.error('Error al actualizar guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { rol: true }
    })
    if (!usuario || !['superadmin', 'admin', 'coordinador'].includes(usuario.rol.nombre.toLowerCase())) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Obtener la guardia antes de borrar para saber si hay que decrementar prácticas
    const guardia = await prisma.guardia.findUnique({ where: { id } })

    await prisma.dieta.deleteMany({ where: { guardiaId: id } })
    await prisma.guardia.delete({ where: { id } })

    // Si el voluntario estaba en prácticas cuando se creó este turno, decrementar el contador
    if (guardia) {
      const ficha = await prisma.fichaVoluntario.findUnique({ where: { usuarioId: guardia.usuarioId } })
      if (ficha?.enPracticas && ficha.turnosPracticasRealizados > 0) {
        await prisma.fichaVoluntario.update({
          where: { usuarioId: guardia.usuarioId },
          data: { turnosPracticasRealizados: { decrement: 1 } }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar guardia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
