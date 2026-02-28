import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener voluntarios disponibles para un día y turno específico
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fecha = searchParams.get('fecha'); // YYYY-MM-DD
        const turno = searchParams.get('turno'); // 'mañana' | 'tarde'

        if (!fecha || !turno) {
            return NextResponse.json(
                { error: 'Parámetros fecha y turno son requeridos' },
                { status: 400 }
            );
        }

        // Calcular el lunes de la semana que contiene esta fecha
        const fechaObj = new Date(fecha + 'T12:00:00');
        const diaSemana = fechaObj.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
        const diasHastaLunes = (diaSemana === 0 ? -6 : 1 - diaSemana);
        const lunesDate = new Date(fechaObj);
        lunesDate.setDate(fechaObj.getDate() + diasHastaLunes);
        const semanaInicio = lunesDate.toISOString().split('T')[0];
        const semanaInicioDate = new Date(semanaInicio + 'T12:00:00');

        // Obtener el día de la semana en español
        const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemanaNombre = nombresDias[diaSemana];

        // Buscar disponibilidades para esa semana
        const disponibilidades = await prisma.disponibilidad.findMany({
            where: {
                semanaInicio: semanaInicioDate,
                noDisponible: false, // Excluir los que marcaron "no disponible"
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

        // Filtrar solo los que tienen disponibilidad para ese día y turno específico
        const voluntariosDisponibles = disponibilidades
            .filter((disp) => {
                const detalles = disp.detalles as Record<string, string[]>;
                const turnosDelDia = detalles[diaSemanaNombre] || [];

                // Verificar si el voluntario marcó ese turno específico
                if (turno === 'mañana') {
                    return turnosDelDia.includes('Mañana') || turnosDelDia.includes('mañana');
                } else {
                    return turnosDelDia.includes('Tarde') || turnosDelDia.includes('tarde');
                }
            })
            .map((disp) => ({
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

        // Calcular stats
        const stats = {
            total: voluntariosDisponibles.length,
            responsablesTurno: voluntariosDisponibles.filter((v) => v.responsableTurno).length,
            conCarnet: voluntariosDisponibles.filter((v) => v.carnetConducir).length,
            experienciaAlta: voluntariosDisponibles.filter((v) => v.experiencia === 'ALTA').length,
        };

        return NextResponse.json({
            voluntarios: voluntariosDisponibles,
            stats,
            fecha,
            turno,
            diaSemanaNombre,
        });
    } catch (error) {
        console.error('Error en GET /api/disponibilidad/por-turno:', error);
        return NextResponse.json(
            { error: 'Error al obtener voluntarios disponibles' },
            { status: 500 }
        );
    }
}
