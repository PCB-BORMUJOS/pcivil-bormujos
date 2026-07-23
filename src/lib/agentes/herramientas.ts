// Herramientas de consulta que los agentes pueden invocar durante la
// conversación para leer datos que no caben en el contexto inicial.
// TODAS son de solo lectura: ninguna modifica la base de datos.

import type Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { detallePractica } from './contexto'

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: 'consultar_practicas',
    description:
      'Devuelve el contenido íntegro de las fichas de práctica del catálogo formativo: objetivo, definición, descripción, desarrollo, conclusiones, prerrequisitos, material necesario, lugar, y el análisis de riesgo de la práctica y de la intervención. Úsala siempre que necesites revisar, evaluar o proponer mejoras sobre prácticas concretas, en lugar de responder con lo que recuerdes. Puedes filtrar por familia (incendios, socorrismo, vehiculos, rescate, transmisiones, drones, general) o pedir números concretos.',
    input_schema: {
      type: 'object',
      properties: {
        familia: { type: 'string', description: 'Familia a consultar: incendios, socorrismo, vehiculos, rescate, transmisiones, drones o general.' },
        numeros: { type: 'array', items: { type: 'string' }, description: 'Números concretos de práctica, por ejemplo ["EXT-TEN-001","INC-091"].' },
        texto: { type: 'string', description: 'Texto a buscar en el título o el contenido.' },
        soloActivas: { type: 'boolean', description: 'Si es true, excluye las prácticas inactivas. Por defecto se devuelven todas.' },
      },
    },
  },
  {
    name: 'consultar_registros_practica',
    description:
      'Devuelve los registros de prácticas realizadas: cuándo se hizo cada práctica y con qué observaciones. Útil para saber qué se entrena de verdad, qué lleva mucho sin practicarse y cómo se reparte la participación.',
    input_schema: {
      type: 'object',
      properties: {
        practicaId: { type: 'string', description: 'Identificador de una práctica concreta.' },
        limite: { type: 'number', description: 'Número máximo de registros a devolver (por defecto 100).' },
      },
    },
  },
  {
    name: 'consultar_contrato_pci',
    description:
      'Devuelve el detalle del contrato de protección contra incendios de los edificios municipales: revisiones por campaña, hallazgos, presupuestos correctivos y acciones pendientes. Úsala para cuestiones sobre revisiones reglamentarias de edificios.',
    input_schema: {
      type: 'object',
      properties: {
        edificio: { type: 'string', description: 'Nombre, alias o código de cliente del edificio. Si se omite, devuelve el resumen de todos.' },
      },
    },
  },
]

const fecha = (d?: Date | null) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'sin fecha'

export async function ejecutarHerramienta(nombre: string, input: any): Promise<string> {
  try {
    if (nombre === 'consultar_practicas') {
      const { familia, numeros, texto, soloActivas } = input || {}
      const where: any = {}
      if (familia) where.familia = familia
      if (Array.isArray(numeros) && numeros.length) where.numero = { in: numeros }
      if (texto) where.OR = [
        { titulo: { contains: texto, mode: 'insensitive' } },
        { objetivo: { contains: texto, mode: 'insensitive' } },
        { desarrollo: { contains: texto, mode: 'insensitive' } },
      ]
      if (soloActivas) where.activa = true

      const practicas = await prisma.practica.findMany({ where, orderBy: { numero: 'asc' }, take: 60 })
      if (!practicas.length) return 'No hay prácticas que cumplan ese criterio.'
      return `${practicas.length} ficha(s):\n\n` + practicas.map(p => detallePractica(p, 2500)).join('\n\n')
    }

    if (nombre === 'consultar_registros_practica') {
      const { practicaId, limite } = input || {}
      const registros = await prisma.registroPractica.findMany({
        where: practicaId ? { practicaId } : {},
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limite) || 100, 200),
      })
      if (!registros.length) return 'No hay registros de prácticas realizadas con ese criterio.'
      return registros.map((r: any) =>
        `${fecha(r.fecha || r.createdAt)} · práctica ${r.practicaId} · ${r.observaciones || 'sin observaciones'}`
      ).join('\n')
    }

    if (nombre === 'consultar_contrato_pci') {
      const { edificio } = input || {}
      if (!edificio) {
        const edificios = await prisma.edificio.findMany({
          where: { revisionesPci: { some: {} } },
          include: { _count: { select: { revisionesPci: true, accionesPci: true } } },
          orderBy: { nombre: 'asc' },
        })
        return edificios.map(e => `${e.codigoCliente || '—'} · ${e.nombre} · ${e._count.revisionesPci} revisión(es) · ${e._count.accionesPci} acción(es)`).join('\n')
      }
      const ed = await prisma.edificio.findFirst({
        where: {
          OR: [
            { codigoCliente: edificio },
            { nombre: { contains: edificio, mode: 'insensitive' } },
            { alias: { contains: edificio, mode: 'insensitive' } },
          ],
        },
        include: {
          revisionesPci: { include: { hallazgos: true, presupuestos: true }, orderBy: { fecha: 'asc' } },
          accionesPci: { include: { presupuesto: { select: { numero: true } } } },
        },
      })
      if (!ed) return 'No se ha encontrado ningún edificio con esa referencia.'
      const lineas = [`Edificio: ${ed.nombre} (${ed.codigoCliente || 'sin código'})`]
      ed.revisionesPci.forEach(r => {
        lineas.push(`\nRevisión ${r.campana} (${fecha(r.fecha)}, ${r.tipo}) — ${r.resultado}`)
        r.hallazgos.forEach(h => lineas.push(`  · [${h.estado}] ${h.elemento}: ${h.descripcion}`))
        r.presupuestos.forEach(p => lineas.push(`  · Presupuesto ${p.numero}: ${p.total} €`))
      })
      ed.accionesPci.forEach(a => {
        lineas.push(`\nAcción: ${a.descripcion} · ${a.estado} · prioridad ${a.prioridad} · ${a.importe ?? '?'} €${a.recurrente ? ` · RECURRENTE ×${a.vecesDetectada}` : ''}${a.presupuesto ? ` · ppto ${a.presupuesto.numero}` : ''}`)
      })
      return lineas.join('\n')
    }

    return `Herramienta desconocida: ${nombre}`
  } catch (error) {
    console.error('Error ejecutando herramienta del agente', nombre, error)
    return 'No ha sido posible consultar ese dato en este momento.'
  }
}
