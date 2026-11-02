/**
 * Recalcula las dietas de un mes aplicando la regla correcta: cada turno es una
 * dieta propia y su tramo se calcula con las horas de ESE turno. Mañana y tarde
 * el mismo día son dos dietas de más de 4 horas, no una de más de 8.
 *
 *   npx tsx scripts/recalcular-dietas-mes.ts 2026-10            → simula
 *   npx tsx scripts/recalcular-dietas-mes.ts 2026-10 --aplicar  → escribe
 *
 * El invariante que aplica es simple: el importe de una dieta debe ser el tramo
 * que corresponde a las horas de su propio turno. Nada más. Un tramo de 8h o
 * 12h señalado en el calendario queda registrado con sus horas reales, así que
 * cumple el invariante y no se toca.
 *
 * Revisa TODAS las dietas del mes, no solo los días con más de un turno: cuando
 * se borraba la guardia del otro turno la consolidación no se deshacía, y
 * quedaban filas huérfanas, unas a 0 € —sin cobrar el día trabajado— y otras con
 * el importe inflado del tramo acumulado.
 *
 * El kilometraje no se modifica: sigue contándose una vez al día y ya está bien
 * repartido.
 *
 * Deja el estado anterior de cada dieta en la trazabilidad antes de escribir,
 * así que la corrección es reversible. No toca a J-44, que tiene su propio
 * baremo e informe.
 */

import { prisma } from '../src/lib/db'
import { INDICATIVO_JEFE_SERVICIO } from '../src/lib/dietas-j44'

async function main() {
    const mes = process.argv[2]
    const aplicar = process.argv.includes('--aplicar')
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
        console.error('Uso: npx tsx scripts/recalcular-dietas-mes.ts AAAA-MM [--aplicar]')
        process.exit(1)
    }

    const cfg = await prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } })
    let raw: any = cfg?.valor
    if (typeof raw === 'string') raw = JSON.parse(raw)
    const baremo = (Array.isArray(raw) ? raw : raw?.tramos || [])
        .map((t: any) => ({ min: Number(t.horasMin ?? t.minHours ?? 0), amt: Number(t.importe ?? t.amount ?? 0) }))
        .sort((a: any, b: any) => a.min - b.min)
    if (!baremo.length) throw new Error('No hay baremo de dietas configurado')
    const tramoPorHoras = (h: number) => { let r = 0; for (const t of baremo) if (h >= t.min) r = t.amt; return r }

    const dietas = await prisma.dieta.findMany({
        where: { mesAnio: mes },
        select: {
            id: true, usuarioId: true, fecha: true, turno: true, horasTrabajadas: true,
            importeDia: true, subtotalDietas: true, subtotalKm: true, totalDieta: true, motivoExtra: true,
            usuario: { select: { numeroVoluntario: true, nombre: true, apellidos: true, fichaVoluntario: { select: { indicativo2: true } } } },
        },
    })
    const resto = dietas.filter(d => d.usuario.fichaVoluntario?.indicativo2 !== INDICATIVO_JEFE_SERVICIO)

    const cambios: any[] = []
    resto.forEach(d => {
        const antes = Number(d.subtotalDietas)
        const correcto = tramoPorHoras(Number(d.horasTrabajadas))
        if (Math.abs(correcto - antes) < 0.005) return
        cambios.push({
            id: d.id,
            indicativo: d.usuario.numeroVoluntario,
            nombre: `${d.usuario.nombre} ${d.usuario.apellidos}`,
            fecha: d.fecha.toISOString().slice(0, 10),
            turno: d.turno,
            horas: Number(d.horasTrabajadas),
            antes,
            correcto,
            subtotalKm: Number(d.subtotalKm),
            totalAntes: Number(d.totalDieta),
            totalDespues: Math.round((correcto + Number(d.subtotalKm)) * 100) / 100,
            motivoExtra: d.motivoExtra,
        })
    })
    cambios.sort((a, b) => (a.indicativo || '').localeCompare(b.indicativo || '') || a.fecha.localeCompare(b.fecha))

    console.log(aplicar ? `\n=== APLICANDO · ${mes} ===\n` : `\n=== SIMULACIÓN · ${mes} (no escribe nada) ===\n`)
    console.log('IND    FECHA       TURNO    HORAS      ANTES    CORRECTO     CAMBIO')
    cambios.forEach(c => console.log(
        (c.indicativo || '?').padEnd(6), c.fecha, String(c.turno).padEnd(8),
        String(c.horas).padStart(5),
        (c.antes.toFixed(2) + '€').padStart(11),
        (c.correcto.toFixed(2) + '€').padStart(11),
        ((c.correcto > c.antes ? '+' : '') + (c.correcto - c.antes).toFixed(2) + '€').padStart(11),
        c.motivoExtra ? '  ⚠ ' + c.motivoExtra : ''))

    // Neto por indicativo, que es lo que se traslada a la liquidación
    const porInd: Record<string, { nombre: string; neto: number; filas: number }> = {}
    cambios.forEach(c => {
        porInd[c.indicativo] ||= { nombre: c.nombre, neto: 0, filas: 0 }
        porInd[c.indicativo].neto += c.correcto - c.antes
        porInd[c.indicativo].filas++
    })
    console.log('\nNETO POR INDICATIVO')
    Object.entries(porInd).sort().forEach(([k, v]) => console.log(
        `  ${k.padEnd(6)} ${((v.neto > 0 ? '+' : '') + v.neto.toFixed(2) + ' €').padStart(10)}   ${v.nombre}`))
    const neto = cambios.reduce((s, c) => s + (c.correcto - c.antes), 0)
    console.log(`\n${cambios.length} dieta(s) afectada(s) · NETO DEL MES: ${neto > 0 ? '+' : ''}${neto.toFixed(2)} €`)

    if (!aplicar) { console.log('\nRelanza con --aplicar para escribir.'); return }
    if (!cambios.length) { console.log('\nNada que corregir.'); return }

    // El estado anterior queda guardado antes de tocar nada
    await prisma.auditLog.create({
        data: {
            accion: 'UPDATE',
            entidad: 'Dieta',
            descripcion: `Recálculo de dietas de ${mes}: cada turno pasa a liquidarse por sus propias horas (mañana y tarde el mismo día = dos dietas de +4h). ${cambios.length} dieta(s), neto ${neto > 0 ? '+' : ''}${neto.toFixed(2)} €`,
            datosAnteriores: { dietas: cambios.map(c => ({ id: c.id, subtotalDietas: c.antes, totalDieta: c.totalAntes })) },
            datosNuevos: { dietas: cambios.map(c => ({ id: c.id, subtotalDietas: c.correcto, totalDieta: c.totalDespues })) },
            modulo: 'Administracion',
        },
    })

    for (const c of cambios) {
        await prisma.dieta.update({
            where: { id: c.id },
            data: { importeDia: c.correcto, subtotalDietas: c.correcto, totalDieta: c.totalDespues },
        })
    }
    console.log(`\nActualizadas ${cambios.length} dietas. Estado anterior guardado en trazabilidad.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
