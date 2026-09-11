/**
 * Reconstruye los avisos de disponibilidad no enviada de las semanas cuyo plazo
 * ya venció.
 *
 * La comprobación automática de los viernes nunca llegó a ejecutarse —le
 * faltaba CRON_SECRET en Vercel y moría antes de hacer nada—, así que el
 * histórico de «Mi Área» y la reincidencia de Estadísticas estaban vacíos pese
 * a que las faltas sí se habían producido.
 *
 *   npx tsx scripts/reconstruir-avisos-disponibilidad.ts            → simula
 *   npx tsx scripts/reconstruir-avisos-disponibilidad.ts --aplicar  → escribe
 *
 * Reutiliza la misma lógica que el cron, así que cuenta exactamente igual. No
 * envía notificaciones ni mensajes: no tiene sentido avisar hoy de una semana
 * de junio, solo dejar constancia.
 */

import {
    registrarAvisosDisponibilidad, semanasConPlazoVencido,
    usuariosObligados, EXENTOS_DISPONIBILIDAD, isoDe,
} from '../src/lib/disponibilidad-avisos'
import { prisma } from '../src/lib/db'

async function main() {
    const aplicar = process.argv.includes('--aplicar')

    const semanas = await semanasConPlazoVencido()
    const obligados = await usuariosObligados()

    console.log(aplicar ? '\n=== APLICANDO CAMBIOS ===\n' : '\n=== SIMULACIÓN (no escribe nada) ===\n')
    console.log(`Semanas con plazo vencido: ${semanas.length}`,
        semanas.length ? `(${isoDe(semanas[0])} → ${isoDe(semanas[semanas.length - 1])})` : '')
    console.log(`Obligados a enviar: ${obligados.length}   ·   exentos: ${EXENTOS_DISPONIBILIDAD.join(', ')}\n`)

    const { creados, yaExistian } = await registrarAvisosDisponibilidad({
        semanas, notificar: false, simular: !aplicar,
    })

    const porPersona = new Map<string, { nombre: string; semanas: string[] }>()
    creados.forEach(c => {
        if (!porPersona.has(c.indicativo)) porPersona.set(c.indicativo, { nombre: c.nombre, semanas: [] })
        porPersona.get(c.indicativo)!.semanas.push(c.semana)
    })

    console.log(`Avisos ${aplicar ? 'registrados' : 'que se registrarían'}: ${creados.length}`)
    if (yaExistian) console.log(`Ya existían y se respetan: ${yaExistian}`)
    console.log()

    const orden = Array.from(porPersona.entries()).sort((a, b) => b[1].semanas.length - a[1].semanas.length)
    for (const [indicativo, d] of orden) {
        console.log(`  ${String(d.semanas.length).padStart(2)}/${semanas.length}  ${indicativo.padEnd(5)} ${d.nombre}`)
        console.log(`         ${d.semanas.join('  ')}`)
    }

    await prisma.$disconnect()
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
