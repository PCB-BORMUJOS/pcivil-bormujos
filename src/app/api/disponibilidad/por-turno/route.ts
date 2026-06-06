import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD
    const turno = searchParams.get('turno'); // 'mañana' | 'tarde'

    if (!fecha || !turno) {
      return NextResponse.json({ error: 'Parámetros fecha y turno son requeridos' }, { status: 400 });
    }

    const esAdmin = ['superadmin', 'admin', 'coordinador'].includes((session.user as any).rol)

    // Calcular el lunes de la semana que contiene esta fecha
    const fechaObj = new Date(fecha + 'T12:00:00');
    const diaSemana = fechaObj.getDay();
    const diasHastaLunes = (diaSemana === 0 ? -6 : 1 - diaSemana);
    const lunesDate = new Date(fechaObj);
    lunesDate.setDate(fechaObj.getDate() + diasHastaLunes);
    const semanaInicio = lunesDate.toISOString().split('T')[0];
    const semanaInicioDate = new Date(semanaInicio + 'T00:00:00.000Z');
    const semanaInicioDateFin = new Date(semanaInicio + 'T23:59:59.999Z');

    // Estado de publicación (explícito via SemanaPublicada)
    const semanaPublicada = await prisma.semanaPublicada.findUnique({ where: { semana: semanaInicio } })
    const publicado = semanaPublicada?.publicado ?? false
    const mostrarIdentidades = esAdmin || publicado

    // Nombre del día en español
    const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSemanaNombre = nombresDias[diaSemana];

    // Disponibilidades para esa semana (excluye B-12 de la lista operativa)
    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        semanaInicio: { gte: semanaInicioDate, lte: semanaInicioDateFin },
        noDisponible: false,
        usuario: { numeroVoluntario: { not: 'B-12' } },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            numeroVoluntario: true,
            responsableTurno: true,
            carnetConducir: true,
            experiencia: true,
          },
        },
      },
    });

    // Filtrar los que tienen disponibilidad para ese turno específico
    const disponiblesTurno = disponibilidades.filter((disp) => {
      const detalles = disp.detalles as Record<string, string[]>;
      const turnosDelDia = detalles[diaSemanaNombre] || [];
      if (turno === 'mañana') {
        return turnosDelDia.includes('Mañana') || turnosDelDia.includes('mañana');
      } else {
        return turnosDelDia.includes('Tarde') || turnosDelDia.includes('tarde');
      }
    });

    const voluntariosData = disponiblesTurno.map((disp) => ({
      id: disp.usuario.id,
      nombre: disp.usuario.nombre,
      apellidos: disp.usuario.apellidos,
      numeroVoluntario: disp.usuario.numeroVoluntario,
      responsableTurno: disp.usuario.responsableTurno,
      carnetConducir: disp.usuario.carnetConducir,
      experiencia: disp.usuario.experiencia,
      puedeDobleturno: disp.puedeDobleturno,
      turnosDeseados: disp.turnosDeseados,
    }));

    const total = voluntariosData.length;

    const stats = {
      total,
      responsablesTurno: voluntariosData.filter((v) => v.responsableTurno).length,
      conCarnet: voluntariosData.filter((v) => v.carnetConducir).length,
      experienciaAlta: voluntariosData.filter((v) => v.experiencia === 'ALTA').length,
    };

    const listaVisible = mostrarIdentidades ? voluntariosData : []

    return NextResponse.json({
      voluntarios: listaVisible,
      enTurno: listaVisible,
      todosHoy: listaVisible,
      total,
      disponibles: total, // alias for dashboard compatibility
      publicado,
      stats,
      fecha,
      turno,
      diaSemanaNombre,
    });
  } catch (error) {
    console.error('Error en GET /api/disponibilidad/por-turno:', error);
    return NextResponse.json({ error: 'Error al obtener voluntarios disponibles' }, { status: 500 });
  }
}
