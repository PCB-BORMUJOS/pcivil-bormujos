/**
 * Corrige el remitente de los recordatorios de disponibilidad ya enviados.
 *
 * El remitente se elegía con un findFirst sin ordenar sobre todos los
 * coordinadores y administradores, así que los 85 avisos salieron a nombre de
 * compañeros que no los habían mandado —60 de B-35 y 25 de S-02— en lugar de la
 * Jefatura del Servicio. El código ya está arreglado; esto repara el histórico,
 * y al cambiar el remitente los mensajes dejan de aparecer en la bandeja de
 * «Enviados» de esas dos personas y pasan a la de J-44.
 *
 *   npx tsx scripts/corregir-remitente-recordatorios.ts            → simula
 *   npx tsx scripts/corregir-remitente-recordatorios.ts --aplicar  → escribe
 *
 * Guarda el remitente anterior de cada mensaje en la trazabilidad, de modo que
 * la corrección es reversible y queda constancia de quién la hizo.
 */

import { prisma } from '../src/lib/db'
import { INDICATIVO_JEFE_SERVICIO } from '../src/lib/dietas-j44'

const ASUNTO = 'Recordatorio: disponibilidad pendiente'

async function main() {
    const aplicar = process.argv.includes('--aplicar')

    const jefe = await prisma.usuario.findFirst({
        where: { activo: true, numeroVoluntario: INDICATIVO_JEFE_SERVICIO },
        select: { id: true, nombre: true, apellidos: true, numeroVoluntario: true },
    })
    if (!jefe) throw new Error(`No hay usuario activo con indicativo ${INDICATIVO_JEFE_SERVICIO}`)

    const mensajes = await prisma.mensaje.findMany({
        where: { asunto: { startsWith: ASUNTO }, remitenteId: { not: jefe.id } },
        select: { id: true, remitenteId: true, createdAt: true, remitente: { select: { numeroVoluntario: true } } },
    })

    console.log(aplicar ? '\n=== APLICANDO ===\n' : '\n=== SIMULACIÓN (no escribe nada) ===\n')
    console.log(`Destino del remitente: ${jefe.numeroVoluntario} ${jefe.nombre} ${jefe.apellidos}`)
    console.log(`Mensajes a corregir: ${mensajes.length}`)

    const porOrigen: Record<string, number> = {}
    mensajes.forEach(m => {
        const k = m.remitente.numeroVoluntario || m.remitenteId
        porOrigen[k] = (porOrigen[k] || 0) + 1
    })
    Object.entries(porOrigen).forEach(([k, n]) => console.log(`   ${String(n).padStart(3)} que figuraban como ${k}`))

    if (!mensajes.length) { console.log('\nNada que corregir.'); return }
    if (!aplicar) { console.log('\nRelanza con --aplicar para escribir.'); return }

    // El estado anterior queda guardado antes de tocar nada
    const anteriores = mensajes.map(m => ({ mensajeId: m.id, remitenteId: m.remitenteId, indicativo: m.remitente.numeroVoluntario }))
    await prisma.auditLog.create({
        data: {
            accion: 'UPDATE',
            entidad: 'Mensaje',
            descripcion: `Corrección del remitente de ${mensajes.length} recordatorios de disponibilidad: pasan a ${jefe.numeroVoluntario} (antes ${Object.entries(porOrigen).map(([k, n]) => `${k}×${n}`).join(', ')})`,
            datosAnteriores: { mensajes: anteriores },
            datosNuevos: { remitenteId: jefe.id, indicativo: jefe.numeroVoluntario },
            usuarioId: jefe.id,
            usuarioNombre: `${jefe.nombre} ${jefe.apellidos}`,
            modulo: 'Mensajes',
        },
    })

    const { count } = await prisma.mensaje.updateMany({
        where: { id: { in: mensajes.map(m => m.id) } },
        data: { remitenteId: jefe.id },
    })
    console.log(`\nCorregidos: ${count}`)

    // Comprobación posterior
    const resto = await prisma.mensaje.groupBy({
        by: ['remitenteId'],
        where: { asunto: { startsWith: ASUNTO } },
        _count: { id: true },
    })
    const us = await prisma.usuario.findMany({ select: { id: true, numeroVoluntario: true } })
    const ind = new Map(us.map(u => [u.id, u.numeroVoluntario]))
    console.log('Remitentes tras la corrección:')
    resto.forEach(r => console.log(`   ${ind.get(r.remitenteId)} → ${r._count.id}`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
