import { prisma } from '@/lib/db'
import { construirConfigSemana, configSemanaHabitual, type ConfigSemana } from '@/lib/turnos'

/**
 * Configuración de turnos de una semana (lunes en formato YYYY-MM-DD).
 *
 * Si la semana no está dada de alta como especial —o si la consulta falla— se
 * devuelve el reparto habitual de mañana y tarde. Esto es deliberado: un fallo
 * aquí nunca debe dejar sin turnos a una semana normal.
 */
export async function getConfigSemana(semana: string): Promise<ConfigSemana> {
    try {
        const fila = await prisma.semanaEspecial.findUnique({ where: { semana } })
        return construirConfigSemana(fila)
    } catch (error) {
        console.error(`Error leyendo SemanaEspecial ${semana}, se usa el reparto habitual:`, error)
        return configSemanaHabitual()
    }
}

/** Igual que getConfigSemana pero para varias semanas de una vez. */
export async function getConfigSemanas(semanas: string[]): Promise<Record<string, ConfigSemana>> {
    const resultado: Record<string, ConfigSemana> = {}
    for (const s of semanas) resultado[s] = configSemanaHabitual()
    if (semanas.length === 0) return resultado

    try {
        const filas = await prisma.semanaEspecial.findMany({ where: { semana: { in: semanas } } })
        for (const fila of filas) resultado[fila.semana] = construirConfigSemana(fila)
    } catch (error) {
        console.error('Error leyendo SemanaEspecial en lote, se usa el reparto habitual:', error)
    }
    return resultado
}
