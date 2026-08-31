import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TIPOLOGIAS_PSI } from '@/constants/partesPSI'
import {
    EXTINTOR_ABC_CHECKS, EXTINTOR_CO2_CHECKS, GAS_IZQ, GAS_DER,
    DOC_IZQ, DOC_DER, ELECTRICA, EVACUACION,
} from '@/lib/prf-campos'
import {
    TRASLADO, INMOVILIZACION, VIA_AEREA, NEUROLOGIA, CIRCULACION, LESIONES,
} from '@/lib/pas-campos'
import { CASETAS_FERIA } from '@/lib/casetas-feria'

/**
 * Estadísticas de los partes de servicio: PSI, PRF y PAS.
 *
 * Cada tipo de parte recoge cosas distintas, así que cada uno tiene su propio
 * bloque de estadísticas: el PSI habla de tipologías, equipos y vehículos; el
 * PRF de casetas, extintores e incumplimientos; el PAS de pacientes, hallazgos
 * y técnicas. El parámetro `tipos` decide cuáles se calculan, de modo que la
 * misma API sirve para la pantalla de cada tipo de parte y para la pestaña
 * «Partes» del módulo general, donde se ven los tres juntos.
 *
 * Todo sale de la base de datos y solo se cuenta lo que está realmente grabado:
 * antes que un cero engañoso, se prefiere no enseñar el dato.
 *
 * Cuelga de /api/partes y no de /api/estadisticas a propósito: así el permiso
 * que hace falta es el del módulo de partes, el mismo que el de las pantallas
 * que la consumen.
 *
 * Los partes archivados no cuentan, igual que en sus listados.
 */

type Tipo = 'PSI' | 'PRF' | 'PAS'

/** Cuenta ocurrencias y devuelve pares [clave, n] de mayor a menor. */
function contar(valores: (string | null | undefined)[]): [string, number][] {
    const m: Record<string, number> = {}
    valores.forEach(v => {
        const k = (v || '').trim()
        if (k) m[k] = (m[k] || 0) + 1
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
}

const lista = (v: unknown): any[] => (Array.isArray(v) ? v : [])
const texto = (v: unknown) => String(v ?? '').trim()

/**
 * Agrupa textos escritos a mano que designan lo mismo. El lugar se teclea libre
 * en cada parte, así que "Recinto Ferial", "Recinto ferial" y "Recinto Ferial,
 * Bormujos" acababan como tres entradas distintas y el ranking no significaba
 * nada. Se compara sin mayúsculas, acentos ni puntuación, y se muestra la
 * grafía más repetida.
 */
function agrupar(valores: (string | null | undefined)[]): [string, number][] {
    const normal = (s: string) => s
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[.,;:]/g, ' ').replace(/\s+/g, ' ').trim()
        // Casi todos los servicios son en Bormujos: nombrarlo o no es el mismo sitio.
        .replace(/\s+(de\s+)?bormujos$/, '')
    const grupos: Record<string, { textos: Record<string, number>; n: number }> = {}
    valores.forEach(v => {
        const t = (v || '').trim()
        if (!t) return
        const k = normal(t)
        if (!k) return
        if (!grupos[k]) grupos[k] = { textos: {}, n: 0 }
        grupos[k].textos[t] = (grupos[k].textos[t] || 0) + 1
        grupos[k].n++
    })
    return Object.values(grupos)
        .map(g => [Object.entries(g.textos).sort((a, b) => b[1] - a[1])[0][0], g.n] as [string, number])
        .sort((a, b) => b[1] - a[1])
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const anio = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
        const pedidos = (searchParams.get('tipos') || 'PSI,PRF,PAS').toUpperCase()
        const tipos: Tipo[] = (['PSI', 'PRF', 'PAS'] as Tipo[]).filter(t => pedidos.includes(t))

        const rango = {
            gte: new Date(`${anio}-01-01T00:00:00.000Z`),
            lte: new Date(`${anio}-12-31T23:59:59.999Z`),
        }

        const [psi, prf, pas, vehiculos] = await Promise.all([
            tipos.includes('PSI') ? prisma.partePSI.findMany({
                where: { fecha: rango, archivado: false },
                select: {
                    fecha: true, estado: true, lugar: true, circulacion: true, motivo: true,
                    tipologias: true, equipoWalkies: true, vehiculosIds: true,
                    tieneHeridos: true, numeroHeridos: true, numeroFallecidos: true,
                    horaLlamada: true, horaDisponible: true,
                },
            }) : [],
            tipos.includes('PRF') ? prisma.partePRF.findMany({
                where: { fecha: rango, archivado: false },
                select: { fecha: true, estado: true, resultado: true, nombreCaseta: true, numeroCaseta: true, datos: true },
            }) : [],
            tipos.includes('PAS') ? prisma.partePAS.findMany({
                where: { fecha: rango, archivado: false },
                select: { fecha: true, estado: true, lugar: true, datos: true, lesiones: true },
            }) : [],
            tipos.includes('PSI') ? prisma.vehiculo.findMany({ select: { id: true, indicativo: true } }) : [],
        ])

        const mes = (d: Date) => Number(d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }).slice(5, 7)) - 1

        // Evolución del año, un punto por mes y tipo de parte
        const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i, psi: 0, prf: 0, pas: 0, total: 0 }))
        psi.forEach(p => { porMes[mes(p.fecha)].psi++; porMes[mes(p.fecha)].total++ })
        prf.forEach(p => { porMes[mes(p.fecha)].prf++; porMes[mes(p.fecha)].total++ })
        pas.forEach(p => { porMes[mes(p.fecha)].pas++; porMes[mes(p.fecha)].total++ })

        const respuesta: Record<string, any> = {
            anio,
            tipos,
            total: psi.length + prf.length + pas.length,
            porTipo: [
                { tipo: 'PSI', etiqueta: 'Servicio e intervención', n: psi.length },
                { tipo: 'PRF', etiqueta: 'Revisión de feria', n: prf.length },
                { tipo: 'PAS', etiqueta: 'Soporte vital básico', n: pas.length },
            ].filter(t => tipos.includes(t.tipo as Tipo)),
            porMes,
            porEstado: contar([...psi, ...prf, ...pas].map(p => p.estado)),
        }

        // ── PSI ───────────────────────────────────────────────────────────────
        if (tipos.includes('PSI')) {
            // Las tipologías se guardan como "grupo.id" ("intervencion.svb")
            const etiqueta: Record<string, string> = {}
            ;([['prevencion', 'grupo1'], ['intervencion', 'grupo2'], ['otros', 'grupo3']] as const)
                .forEach(([grupo, clave]) => {
                    (TIPOLOGIAS_PSI[clave] as readonly { id: string; label: string }[])
                        .forEach(t => { etiqueta[`${grupo}.${t.id}`] = t.label })
                })

            const porId = new Map(vehiculos.map(v => [v.id, v.indicativo]))

            respuesta.psi = {
                n: psi.length,
                estados: contar(psi.map(p => p.estado)),
                tipologias: contar(psi.flatMap(p => lista(p.tipologias))).map(([clave, n]) => ({
                    clave,
                    // El grupo distingue un "Otros" de prevención de uno de intervención
                    grupo: clave.split('.')[0],
                    etiqueta: etiqueta[clave] || clave,
                    n,
                })),
                circulacion: contar(psi.map(p => p.circulacion)),
                // Quién sale al servicio, tomado del equipo que consta en el parte
                // y no de quien lo redacta: es lo que refleja el trabajo en calle.
                indicativos: contar(psi.flatMap(p => lista(p.equipoWalkies).map((e: any) => texto(e?.equipo))))
                    .map(([indicativo, n]) => ({ indicativo, n })),
                // En unos partes se grabó el indicativo del vehículo y en otros su
                // id, así que se traduce lo que haga falta.
                vehiculos: contar(psi.flatMap(p => lista(p.vehiculosIds).map((v: any) => porId.get(texto(v)) || texto(v))))
                    .map(([indicativo, n]) => ({ indicativo, n })),
                heridos: {
                    partes: psi.filter(p => p.tieneHeridos).length,
                    total: psi.reduce((s, p) => s + (p.numeroHeridos || 0), 0),
                    fallecidos: psi.reduce((s, p) => s + (p.numeroFallecidos || 0), 0),
                },
                lugares: agrupar(psi.map(p => p.lugar)).slice(0, 8),
                motivos: agrupar(psi.map(p => p.motivo)).slice(0, 8),
            }
        }

        // ── PRF ───────────────────────────────────────────────────────────────
        if (tipos.includes('PRF')) {
            const dato = (p: any) => (p.datos || {}) as Record<string, any>
            const ITEMS = [...EXTINTOR_ABC_CHECKS, ...EXTINTOR_CO2_CHECKS, ...GAS_IZQ, ...GAS_DER,
                ...DOC_IZQ, ...DOC_DER, ...ELECTRICA, ...EVACUACION]

            // Incumplimientos: puntos de la lista de verificación marcados "no".
            // Es lo que de verdad interesa de una revisión.
            const incumple: Record<string, number> = {}
            prf.forEach(p => {
                const checks = (dato(p).checks || {}) as Record<string, string>
                ITEMS.forEach(it => { if (checks[it.key] === 'no') incumple[it.label] = (incumple[it.label] || 0) + 1 })
            })

            // Calle a partir del prefijo del nº de caseta (CUR-03 → Currillo)
            const calleDe = new Map(CASETAS_FERIA.map(c => [c.id.split('-')[0], c.calle]))
            const revisadas = new Set(prf.map(p => texto(p.numeroCaseta)).filter(Boolean))

            const suma = (clave: string) => prf.reduce((s, p) => {
                const n = parseInt(texto(dato(p)[clave]), 10)
                return s + (Number.isFinite(n) ? n : 0)
            }, 0)

            respuesta.prf = {
                n: prf.length,
                estados: contar(prf.map(p => p.estado)),
                resultados: contar(prf.map(p => p.resultado)),
                casetasRevisadas: revisadas.size,
                casetasPlan: CASETAS_FERIA.length,
                porCalle: contar(Array.from(revisadas).map(id => calleDe.get(id.split('-')[0]) || 'Sin identificar')),
                aforoTotal: suma('aforo'),
                modulosTotal: suma('modulos'),
                incumplimientos: Object.entries(incumple).sort((a, b) => b[1] - a[1]).map(([etiqueta, n]) => ({ etiqueta, n })),
                conRequerimientos: prf.filter(p => texto(dato(p).requerimientos)).length,
                requerimientos: prf
                    .map(p => ({ caseta: texto(p.nombreCaseta), texto: texto(dato(p).requerimientos) }))
                    .filter(r => r.texto),
                eficaciaAbc: contar(prf.map(p => texto(dato(p).abcEficacia))),
                eficaciaCo2: contar(prf.map(p => texto(dato(p).co2Eficacia))),
                indicativos: contar(prf.flatMap(p => lista(dato(p).indicativos).map(texto)))
                    .map(([indicativo, n]) => ({ indicativo, n })),
            }
        }

        // ── PAS ───────────────────────────────────────────────────────────────
        if (tipos.includes('PAS')) {
            const dato = (p: any) => (p.datos || {}) as Record<string, any>

            const edades = pas
                .map(p => parseInt(texto(dato(p).edad), 10))
                .filter(e => Number.isFinite(e) && e > 0 && e < 120)
            const FRANJAS = [
                { etiqueta: '0-17', min: 0, max: 17 }, { etiqueta: '18-35', min: 18, max: 35 },
                { etiqueta: '36-55', min: 36, max: 55 }, { etiqueta: '56-70', min: 56, max: 70 },
                { etiqueta: '71+', min: 71, max: 200 },
            ]

            /** Casillas simples marcadas (vía aérea, inmovilización, traslado). */
            const marcados = (items: { key: string; label: string }[]) => {
                const m: Record<string, number> = {}
                pas.forEach(p => {
                    const checks = (dato(p).checks || {}) as Record<string, boolean>
                    items.forEach(i => { if (checks[i.key]) m[i.label] = (m[i.label] || 0) + 1 })
                })
                return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([etiqueta, n]) => ({ etiqueta, n }))
            }

            /**
             * Hallazgos de circulación y neurología. Se registran por duplicado,
             * una casilla por cada tanda de valoración (`_1` y `_2`), así que un
             * hallazgo cuenta una sola vez aunque aparezca en las dos.
             */
            const hallazgos = (items: { key: string; label: string }[]) => {
                const m: Record<string, number> = {}
                pas.forEach(p => {
                    const dobles = (dato(p).dobles || {}) as Record<string, string>
                    items.forEach(i => {
                        if (texto(dobles[`${i.key}_1`]) || texto(dobles[`${i.key}_2`])) {
                            m[i.label] = (m[i.label] || 0) + 1
                        }
                    })
                })
                return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([etiqueta, n]) => ({ etiqueta, n }))
            }

            const CONSTANTES = ['ta', 'fc', 'fr', 'saturacion', 'glucosa', 'respiracion', 'pupilas', 'reactivas']
            const conConstantes = pas.filter(p => lista(dato(p).constantes)
                .some((c: any) => CONSTANTES.some(k => texto(c?.[k])))).length
            const conGlasgow = pas.filter(p => lista(dato(p).constantes)
                .some((c: any) => (c?.glasgowO || 0) + (c?.glasgowV || 0) + (c?.glasgowM || 0) > 0)).length

            const etiquetaLesion = new Map(LESIONES.map(l => [String(l.n), l.label]))
            const lesiones = contar(pas.flatMap(p => lista(p.lesiones).map((m: any) => texto(m?.codigo))))
                .map(([codigo, n]) => ({ etiqueta: etiquetaLesion.get(codigo) || `Código ${codigo}`, n }))

            respuesta.pas = {
                n: pas.length,
                estados: contar(pas.map(p => p.estado)),
                pacientes: {
                    conSexo: pas.filter(p => texto(dato(p).sexo)).length,
                    hombres: pas.filter(p => dato(p).sexo === 'H').length,
                    mujeres: pas.filter(p => dato(p).sexo === 'M').length,
                    edadMedia: edades.length ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length) : null,
                    conEdad: edades.length,
                    franjas: FRANJAS.map(f => ({ etiqueta: f.etiqueta, n: edades.filter(e => e >= f.min && e <= f.max).length })),
                },
                valoracion: { conConstantes, conGlasgow },
                hallazgosCirculacion: hallazgos(CIRCULACION.flatMap(g => g.items)),
                hallazgosNeurologia: hallazgos(NEUROLOGIA),
                lesiones,
                partesConLesiones: pas.filter(p => lista(p.lesiones).length > 0).length,
                viaAerea: marcados(VIA_AEREA),
                traslado: marcados(TRASLADO),
                inmovilizacion: marcados(INMOVILIZACION),
                indicativos: contar(pas.flatMap(p => lista(dato(p).indicativosIntervienen).map(texto)))
                    .map(([indicativo, n]) => ({ indicativo, n })),
                lugares: agrupar(pas.map(p => p.lugar)).slice(0, 8),
                motivos: agrupar(pas.map(p => texto(dato(p).motivo))).slice(0, 8),
            }
        }

        // Ranking conjunto de indicativos, solo cuando se piden varios tipos:
        // en la pantalla de un tipo concreto ya está el suyo.
        if (tipos.length > 1) {
            respuesta.indicativos = contar([
                ...psi.flatMap(p => lista(p.equipoWalkies).map((e: any) => texto(e?.equipo))),
                ...pas.flatMap(p => lista((p.datos as any)?.indicativosIntervienen).map(texto)),
                ...prf.flatMap(p => lista((p.datos as any)?.indicativos).map(texto)),
            ]).slice(0, 12).map(([indicativo, n]) => ({ indicativo, n }))
            respuesta.lugares = agrupar([...psi.map(p => p.lugar), ...pas.map(p => p.lugar)]).slice(0, 8)
        }

        return NextResponse.json(respuesta)
    } catch (error) {
        console.error('Error en /api/partes/estadisticas:', error)
        return NextResponse.json({ error: 'Error obteniendo las estadísticas' }, { status: 500 })
    }
}
