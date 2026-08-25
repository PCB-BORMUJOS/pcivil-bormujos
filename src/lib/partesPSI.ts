import { prisma } from '@/lib/db'

/**
 * Genera el número de parte con formato YYYYMMDD{NNN}-{P}
 * Ejemplo: 20260804004-3
 *   - YYYYMMDD: fecha (Europe/Madrid)
 *   - NNN: nº ordinal del DÍA DE SERVICIO en el mes (solo días con turno);
 *          si un día del mes no hubo turno, no consume número.
 *   - P: nº de parte dentro del día (1, 2, 3...).
 */
export async function generarNumeroParte(): Promise<string> {
    // Fecha de hoy en Madrid (YYYY-MM-DD).
    const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const [yyyy, mm, dd] = hoyStr.split('-')
    const yyyymmdd = `${yyyy}${mm}${dd}`

    // NNN: nº de días distintos con turno (guardias) en el mes, hasta hoy inclusive.
    const inicioMes = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1, 0, 0, 0))
    const finHoy = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 23, 59, 59))
    const guardias = await prisma.guardia.findMany({
        where: { fecha: { gte: inicioMes, lte: finHoy } },
        select: { fecha: true },
    })
    const diasServicio = new Set<string>()
    for (const g of guardias) diasServicio.add(g.fecha.toISOString().split('T')[0])
    // Hoy cuenta como día de servicio (se está creando un parte) aunque aún no
    // se hubiera registrado la guardia.
    diasServicio.add(hoyStr)
    const nnn = String(diasServicio.size).padStart(3, '0')

    // P: nº de parte del día. Se toma el MÁXIMO sufijo -P existente hoy y se suma 1
    // (NO el conteo): así, aunque haya huecos por partes borrados o archivados, el
    // nuevo número nunca colisiona con uno ya usado. Se incluyen los archivados,
    // porque su número sigue reservado por la restricción @unique.
    const partesHoy = await prisma.partePSI.findMany({
        where: { numeroParte: { startsWith: yyyymmdd } },
        select: { numeroParte: true },
    })
    let maxP = 0
    for (const { numeroParte } of partesHoy) {
        const m = numeroParte.match(/-(\d+)$/)
        if (m) maxP = Math.max(maxP, Number(m[1]))
    }
    const p = maxP + 1

    return `${yyyymmdd}${nnn}-${p}`
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

// validarPartePSI moved to psi-validation.ts
