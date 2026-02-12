import { prisma } from '@/lib/db'
import { format } from 'date-fns'

/**
 * Genera el número de parte automático con formato YYYYMMDD-XXX
 * Ejemplo: 20260201-001, 20260201-002, 20260301-001 (reinicia cada mes)
 * Reinicia a 001 el día 1 de cada mes
 */
export async function generarNumeroParte(): Promise<string> {
    const hoy = new Date()
    const prefix = format(hoy, 'yyyyMMdd')
    const mesPrefix = format(hoy, 'yyyyMM') // Prefix para buscar partes del mes

    const ultimoParte = await prisma.partePSI.findFirst({
        where: {
            numeroParte: { startsWith: mesPrefix }, // Buscar en el mes actual
            archivado: false
        },
        orderBy: { numeroParte: 'desc' },
        select: { numeroParte: true }
    })

    if (!ultimoParte) {
        return `${prefix}-001`
    }

    const ultimoNumero = parseInt(ultimoParte.numeroParte.split('-')[1])
    const siguienteNumero = ultimoNumero + 1

    return `${prefix}-${String(siguienteNumero).padStart(3, '0')}`
}

/**
 * Obtiene los indicativos del turno actual desde el cuadrante
 * Determina el turno según la hora actual:
 * - Mañana: 08:00 - 15:00
 * - Tarde: 15:00 - 22:00
 * - Noche: 22:00 - 08:00
 */
export async function obtenerIndicativosTurnoActual(): Promise<string[]> {
    const ahora = new Date()
    const horaActual = ahora.getHours()

    // Determinar turno actual
    let turno: 'mañana' | 'tarde' | 'noche'
    if (horaActual >= 8 && horaActual < 15) {
        turno = 'mañana'
    } else if (horaActual >= 15 && horaActual < 22) {
        turno = 'tarde'
    } else {
        turno = 'noche'
    }

    // Buscar guardia del día y turno correspondiente
    const inicioDia = new Date(ahora)
    inicioDia.setHours(0, 0, 0, 0)

    const finDia = new Date(ahora)
    finDia.setHours(23, 59, 59, 999)

    const guardia = await prisma.guardia.findFirst({
        where: {
            fecha: {
                gte: inicioDia,
                lte: finDia
            },
            turno
        },
        include: {
            usuario: {
                select: {
                    numeroVoluntario: true,
                    nombre: true,
                    apellidos: true
                }
            }
            // Note: The schema for Guardia relations might be different. 
            // Checking Schema: Guardia has usuarioId and relation to Usuario. 
            // But the prompt implies obtaining multiple indicativos from a "Turno".
            // Schema says: Guardia @@unique([usuarioId, fecha, turno]).
            // This means one row per user per shift.
            // So we should findMany guards for that date/shift.
        }
    })

    // Correction based on schema:
    // We need to find ALL guards for that shift.
    const guardias = await prisma.guardia.findMany({
        where: {
            fecha: {
                gte: inicioDia,
                lte: finDia
            },
            turno,
            estado: 'programada' // Or similar? Schema default is 'programada'
        },
        include: {
            usuario: {
                select: {
                    numeroVoluntario: true
                }
            }
        }
    })

    // Extraer indicativos de los usuarios del turno
    const indicativos = guardias
        .map(g => g.usuario.numeroVoluntario)
        .filter((ind): ind is string => ind !== null && ind !== undefined)

    return indicativos
}

/**
 * Obtiene la lista de walkies desde configuración o devuelve lista base
 */
export async function obtenerListaWalkies(): Promise<string[]> {
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: 'equipos_walkies' }
        })

        if (config && config.valor) {
            // Prisma Json type can be anything. We cast it.
            const walkies = config.valor as unknown as string[]
            if (Array.isArray(walkies) && walkies.length > 0) {
                return walkies
            }
        }
    } catch (error) {
        console.error('Error obteniendo walkies desde config:', error)
    }

    // Fallback a lista base
    return [
        'W-01', 'W-02', 'W-03', 'W-04', 'W-05',
        'W-06', 'W-07', 'W-08', 'W-09', 'W-10',
        'W-11', 'W-12', 'W-13', 'W-14', 'W-15',
        'W-16', 'W-17', 'W-18', 'W-19', 'W-20',
        'W-21', 'W-22', 'W-23', 'W-24', 'W-25'
    ]
}

/**
 * Valida que un parte tenga todos los campos obligatorios
 */
export function validarPartePSI(data: any): { valido: boolean; errores: string[] } {
    const errores: string[] = []

    if (!data.lugar || data.lugar.trim() === '') {
        errores.push('El campo "Lugar" es obligatorio')
    }

    if (!data.observaciones || data.observaciones.trim() === '') {
        errores.push('El campo "Observaciones" es obligatorio')
    }

    if (!data.indicativoCumplimenta) {
        errores.push('Debe seleccionar el indicativo que cumplimenta')
    }

    if (!data.firmaIndicativoCumplimenta) {
        errores.push('Falta la firma del indicativo que cumplimenta')
    }

    if (!data.responsableTurno) {
        errores.push('Debe seleccionar el responsable del turno')
    }

    if (!data.firmaResponsableTurno) {
        errores.push('Falta la firma del responsable del turno')
    }

    if (!data.vehiculosIds || data.vehiculosIds.length === 0) {
        errores.push('Debe seleccionar al menos un vehículo')
    }

    if (!data.equipoWalkies || data.equipoWalkies.length === 0) {
        errores.push('Debe añadir al menos una combinación de equipo/walkie')
    }

    // Validacion tipologias: data.tipologias is array of strings
    if (!data.tipologias || data.tipologias.length === 0) {
        errores.push('Debe seleccionar al menos una tipología de servicio')
    }

    return {
        valido: errores.length === 0,
        errores
    }
}
