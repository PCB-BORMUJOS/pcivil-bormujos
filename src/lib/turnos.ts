/**
 * Turnos del servicio.
 *
 * El reparto habitual es mañana + tarde. En semanas puntuales (Feria, Navidad,
 * Semana Santa, Romería...) puede haber además turno de noche, y no
 * necesariamente todos los días.
 *
 * REGLA CLAVE: si una semana no está dada de alta como especial, todo se
 * comporta exactamente igual que antes. El reparto habitual es el valor por
 * defecto en todos los caminos.
 *
 * Este módulo no importa Prisma a propósito: lo usan tanto el cliente como el
 * servidor. La consulta a base de datos vive en `@/lib/turnos-server`.
 */

export type TurnoKey = 'mañana' | 'tarde' | 'noche'

export const DIAS_SEMANA = [
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
] as const

export type DiaSemana = (typeof DIAS_SEMANA)[number]

/** Etiquetas legibles de los días (para la UI). */
export const DIAS_LABEL: Record<DiaSemana, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sábado',
    domingo: 'Domingo',
}

/** Reparto habitual: el que rige mientras la semana no se marque como especial. */
export const TURNOS_HABITUALES: TurnoKey[] = ['mañana', 'tarde']

/**
 * Catálogo de turnos. Las horas son solo un punto de partida: el horario real
 * se fija por slot en el cuadrante (Guardia.horaInicio / horaFin) y es el que
 * manda para horas y dietas.
 */
export const TURNOS_CATALOGO: Record<TurnoKey, {
    label: string
    defaultInicio: string
    defaultFin: string
    /** Clases Tailwind para la casilla marcada en el formulario de disponibilidad. */
    colorActivo: string
    colorHover: string
}> = {
    'mañana': {
        label: 'Mañana',
        defaultInicio: '09:00',
        defaultFin: '14:30',
        colorActivo: 'bg-green-500 border-green-500 text-white',
        colorHover: 'hover:border-green-400',
    },
    'tarde': {
        label: 'Tarde',
        defaultInicio: '17:00',
        defaultFin: '22:00',
        colorActivo: 'bg-blue-500 border-blue-500 text-white',
        colorHover: 'hover:border-blue-400',
    },
    'noche': {
        label: 'Noche',
        defaultInicio: '22:00',
        defaultFin: '02:00',
        colorActivo: 'bg-indigo-600 border-indigo-600 text-white',
        colorHover: 'hover:border-indigo-400',
    },
}

export const TODOS_LOS_TURNOS: TurnoKey[] = ['mañana', 'tarde', 'noche']

/** Mapa día → turnos activos. Siempre tiene las 7 claves. */
export type TurnosPorDia = Record<DiaSemana, TurnoKey[]>

/** Configuración de turnos de una semana concreta. */
export type ConfigSemana = {
    /** Nombre del dispositivo especial, o null si la semana es habitual. */
    nombre: string | null
    esEspecial: boolean
    turnosPorDia: TurnosPorDia
    /** Unión de todos los turnos que aparecen algún día de la semana. */
    turnosUsados: TurnoKey[]
}

function esTurnoValido(t: unknown): t is TurnoKey {
    return t === 'mañana' || t === 'tarde' || t === 'noche'
}

/** Reparto habitual para los 7 días. */
export function turnosPorDiaHabitual(): TurnosPorDia {
    return DIAS_SEMANA.reduce((acc, dia) => {
        acc[dia] = [...TURNOS_HABITUALES]
        return acc
    }, {} as TurnosPorDia)
}

/** La configuración que rige cuando la semana no es especial. */
export function configSemanaHabitual(): ConfigSemana {
    return {
        nombre: null,
        esEspecial: false,
        turnosPorDia: turnosPorDiaHabitual(),
        turnosUsados: [...TURNOS_HABITUALES],
    }
}

/**
 * Normaliza el JSON guardado en `SemanaEspecial.turnosPorDia`, que puede venir
 * incompleto o con valores inesperados. Los días ausentes o vacíos caen al
 * reparto habitual, de forma que un dato corrupto nunca deja una semana sin
 * turnos ni cuela un turno inventado.
 */
export function normalizarTurnosPorDia(raw: unknown): TurnosPorDia {
    const base = turnosPorDiaHabitual()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base

    const entrada = raw as Record<string, unknown>
    for (const dia of DIAS_SEMANA) {
        const valor = entrada[dia]
        if (!Array.isArray(valor)) continue
        // Filtra desconocidos y duplicados, y respeta el orden del catálogo
        const limpios = TODOS_LOS_TURNOS.filter(t => valor.some(v => esTurnoValido(v) && v === t))
        // Un día sin ningún turno válido se interpreta como "sin servicio" solo si
        // se declaró explícitamente vacío; si venía basura, se deja el habitual.
        const teniaAlgoValido = valor.length === 0 || limpios.length > 0
        if (teniaAlgoValido) base[dia] = limpios
    }
    return base
}

/** Construye la ConfigSemana a partir de una fila de SemanaEspecial (o de nada). */
export function construirConfigSemana(
    fila: { nombre: string; turnosPorDia: unknown; activa: boolean } | null | undefined
): ConfigSemana {
    if (!fila || !fila.activa) return configSemanaHabitual()

    const turnosPorDia = normalizarTurnosPorDia(fila.turnosPorDia)
    const usados = TODOS_LOS_TURNOS.filter(t =>
        DIAS_SEMANA.some(dia => turnosPorDia[dia].includes(t))
    )
    return {
        nombre: fila.nombre,
        esEspecial: true,
        turnosPorDia,
        // Si por lo que sea no quedó ningún turno, se cae al habitual para no
        // dejar la semana sin poder recoger disponibilidad.
        turnosUsados: usados.length > 0 ? usados : [...TURNOS_HABITUALES],
    }
}

/**
 * Turnos activos de un día concreto, tolerante con nombres de día en mayúsculas
 * o con acentos ("Miércoles" → "miercoles").
 */
export function turnosDelDia(config: ConfigSemana, dia: string): TurnoKey[] {
    const clave = normalizarNombreDia(dia)
    if (!clave) return [...TURNOS_HABITUALES]
    return config.turnosPorDia[clave] ?? [...TURNOS_HABITUALES]
}

/** "Miércoles" / "MIERCOLES" / "miércoles" → "miercoles". */
export function normalizarNombreDia(dia: string): DiaSemana | null {
    const limpio = dia
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    return (DIAS_SEMANA as readonly string[]).includes(limpio) ? (limpio as DiaSemana) : null
}

/**
 * Compara un turno guardado en `Disponibilidad.detalles` con una clave de turno.
 * Históricamente se han guardado variantes con mayúscula ("Mañana"), así que la
 * comparación ignora mayúsculas y acentos.
 */
export function mismoTurno(guardado: string, turno: TurnoKey): boolean {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return norm(guardado) === norm(turno)
}
