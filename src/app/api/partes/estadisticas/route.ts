import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TIPOLOGIAS_PSI } from '@/constants/partesPSI'
import { TRASLADO, INMOVILIZACION } from '@/lib/pas-campos'

/**
 * Estadísticas de los partes de servicio: PSI, PRF y PAS.
 *
 * Todo sale de la base de datos. Sustituye a la antigua página de estadísticas
 * de partes, que mostraba cifras inventadas y un ranking con nombres que no
 * correspondían a nadie del servicio.
 *
 * Solo se cuenta lo que está realmente grabado. Los campos que en la práctica
 * nadie rellena (por ejemplo la columna `traslado` del PAS, vacía en los 58
 * partes) no aparecen: es preferible una tarjeta menos que un cero engañoso.
 *
 * Los partes archivados no cuentan, igual que en sus listados.
 *
 * Cuelga de /api/partes y no de /api/estadisticas a propósito: así el permiso
 * que hace falta es el del módulo de partes, el mismo que el de la página que
 * la consume. Colgada del otro sitio, quien tuviera acceso a los partes pero no
 * a estadísticas vería la página en blanco.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const anio = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
        const rango = {
            gte: new Date(`${anio}-01-01T00:00:00.000Z`),
            lte: new Date(`${anio}-12-31T23:59:59.999Z`),
        }

        const [psi, prf, pas, vehiculos] = await Promise.all([
            prisma.partePSI.findMany({
                where: { fecha: rango, archivado: false },
                select: {
                    fecha: true, estado: true, lugar: true, circulacion: true,
                    tipologias: true, equipoWalkies: true, vehiculosIds: true,
                    tieneHeridos: true, numeroHeridos: true, numeroFallecidos: true,
                },
            }),
            prisma.partePRF.findMany({
                where: { fecha: rango, archivado: false },
                select: { fecha: true, estado: true, resultado: true, nombreCaseta: true },
            }),
            prisma.partePAS.findMany({
                where: { fecha: rango, archivado: false },
                select: { fecha: true, estado: true, lugar: true, datos: true },
            }),
            prisma.vehiculo.findMany({ select: { id: true, indicativo: true } }),
        ])

        const mes = (d: Date) => Number(d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }).slice(5, 7)) - 1

        // Evolución del año, un punto por mes y tipo de parte
        const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i, psi: 0, prf: 0, pas: 0, total: 0 }))
        psi.forEach(p => { porMes[mes(p.fecha)].psi++; porMes[mes(p.fecha)].total++ })
        prf.forEach(p => { porMes[mes(p.fecha)].prf++; porMes[mes(p.fecha)].total++ })
        pas.forEach(p => { porMes[mes(p.fecha)].pas++; porMes[mes(p.fecha)].total++ })

        /** Cuenta ocurrencias y devuelve pares [clave, n] de mayor a menor. */
        const contar = (valores: (string | null | undefined)[]) => {
            const m: Record<string, number> = {}
            valores.forEach(v => {
                const k = (v || '').trim()
                if (k) m[k] = (m[k] || 0) + 1
            })
            return Object.entries(m).sort((a, b) => b[1] - a[1])
        }
        const lista = (v: unknown): any[] => (Array.isArray(v) ? v : [])

        /**
         * Agrupa textos escritos a mano que designan el mismo sitio. El lugar se
         * teclea libre en cada parte, así que "Recinto Ferial", "Recinto ferial"
         * y "Recinto Ferial, Bormujos" acababan como tres entradas distintas y el
         * ranking no significaba nada. Se compara sin mayúsculas, sin acentos y
         * sin puntuación, y se muestra la grafía más repetida.
         */
        const agrupar = (valores: (string | null | undefined)[]) => {
            const normal = (s: string) => s
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase().replace(/[.,;:]/g, ' ').replace(/\s+/g, ' ').trim()
                // Casi todos los servicios son en Bormujos: nombrarlo o no es la
                // misma ubicación.
                .replace(/\s+(de\s+)?bormujos$/, '')
            const grupos: Record<string, { textos: Record<string, number>; n: number }> = {}
            valores.forEach(v => {
                const texto = (v || '').trim()
                if (!texto) return
                const k = normal(texto)
                if (!k) return
                if (!grupos[k]) grupos[k] = { textos: {}, n: 0 }
                grupos[k].textos[texto] = (grupos[k].textos[texto] || 0) + 1
                grupos[k].n++
            })
            return Object.values(grupos)
                .map(g => [Object.entries(g.textos).sort((a, b) => b[1] - a[1])[0][0], g.n] as [string, number])
                .sort((a, b) => b[1] - a[1])
        }

        // Tipologías del PSI. En base de datos van como "grupo.id" ("intervencion.svb")
        const etiquetaTipologia: Record<string, string> = {}
        ;([['prevencion', 'grupo1'], ['intervencion', 'grupo2'], ['otros', 'grupo3']] as const)
            .forEach(([grupo, clave]) => {
                (TIPOLOGIAS_PSI[clave] as readonly { id: string; label: string }[])
                    .forEach(t => { etiquetaTipologia[`${grupo}.${t.id}`] = t.label })
            })
        const tipologias = contar(psi.flatMap(p => lista(p.tipologias)))
            .map(([clave, n]) => ({
                clave,
                // El grupo distingue un "Otros" de prevención de uno de intervención
                grupo: clave.split('.')[0],
                etiqueta: etiquetaTipologia[clave] || clave,
                n,
            }))

        // Quién sale a los servicios. Se toma del equipo que consta en el parte,
        // no de quien lo redacta: es el dato que refleja el trabajo en calle.
        const enPSI = psi.flatMap(p => lista(p.equipoWalkies).map((e: any) => (e?.equipo || '').trim()))
        const enPAS = pas.flatMap(p => lista((p.datos as any)?.indicativosIntervienen).map((i: any) => String(i || '').trim()))
        const indicativos = contar([...enPSI, ...enPAS]).slice(0, 12).map(([indicativo, n]) => ({ indicativo, n }))

        // Vehículos movilizados. En los partes antiguos se grabó el indicativo y
        // en otros el id del vehículo, así que se traduce lo que haga falta.
        const porId = new Map(vehiculos.map(v => [v.id, v.indicativo]))
        const vehiculosMovilizados = contar(
            psi.flatMap(p => lista(p.vehiculosIds).map((v: any) => porId.get(String(v)) || String(v || ''))),
        ).map(([indicativo, n]) => ({ indicativo, n }))

        // Del PAS: sexo y franjas de edad de las personas atendidas
        const edades = pas
            .map(p => parseInt(String((p.datos as any)?.edad ?? ''), 10))
            .filter(e => Number.isFinite(e) && e > 0 && e < 120)
        const FRANJAS = [
            { etiqueta: '0-17', min: 0, max: 17 }, { etiqueta: '18-35', min: 18, max: 35 },
            { etiqueta: '36-55', min: 36, max: 55 }, { etiqueta: '56-70', min: 56, max: 70 },
            { etiqueta: '71+', min: 71, max: 200 },
        ]
        const pacientes = {
            conSexo: pas.filter(p => (p.datos as any)?.sexo).length,
            hombres: pas.filter(p => (p.datos as any)?.sexo === 'H').length,
            mujeres: pas.filter(p => (p.datos as any)?.sexo === 'M').length,
            edadMedia: edades.length ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length) : null,
            franjas: FRANJAS.map(f => ({ etiqueta: f.etiqueta, n: edades.filter(e => e >= f.min && e <= f.max).length })),
        }

        // Técnicas del PAS: posición de traslado e inmovilización empleadas
        const marcados = (items: { key: string; label: string }[]) => {
            const m: Record<string, number> = {}
            pas.forEach(p => {
                const checks = ((p.datos as any)?.checks || {}) as Record<string, boolean>
                items.forEach(i => { if (checks[i.key]) m[i.label] = (m[i.label] || 0) + 1 })
            })
            return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([etiqueta, n]) => ({ etiqueta, n }))
        }

        return NextResponse.json({
            anio,
            total: psi.length + prf.length + pas.length,
            porTipo: [
                { tipo: 'PSI', etiqueta: 'Servicio e intervención', n: psi.length },
                { tipo: 'PRF', etiqueta: 'Revisión de feria', n: prf.length },
                { tipo: 'PAS', etiqueta: 'Soporte vital básico', n: pas.length },
            ],
            porMes,
            porEstado: contar([...psi, ...prf, ...pas].map(p => p.estado)),
            // PSI
            tipologias,
            circulacion: contar(psi.map(p => p.circulacion)),
            indicativos,
            vehiculosMovilizados,
            heridos: {
                partes: psi.filter(p => p.tieneHeridos).length,
                total: psi.reduce((s, p) => s + (p.numeroHeridos || 0), 0),
                fallecidos: psi.reduce((s, p) => s + (p.numeroFallecidos || 0), 0),
            },
            // PRF
            resultadosPRF: contar(prf.map(p => p.resultado)),
            casetasRevisadas: new Set(prf.map(p => (p.nombreCaseta || '').trim()).filter(Boolean)).size,
            // PAS
            pacientes,
            trasladoPAS: marcados(TRASLADO as any),
            inmovilizacionPAS: marcados(INMOVILIZACION as any),
            // Común a PSI y PAS
            lugares: agrupar([...psi.map(p => p.lugar), ...pas.map(p => p.lugar)]).slice(0, 8),
        })
    } catch (error) {
        console.error('Error en /api/partes/estadisticas:', error)
        return NextResponse.json({ error: 'Error obteniendo las estadísticas' }, { status: 500 })
    }
}
