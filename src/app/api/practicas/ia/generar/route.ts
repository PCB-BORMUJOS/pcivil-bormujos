import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { autorizarIA, crearClienteIA, MODELO_IA, SISTEMA_EXPERTO, textoRespuesta } from '@/lib/ia-formacion'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const auth = await autorizarIA()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const cliente = crearClienteIA()
  if (!cliente) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  try {
    const { familia, cantidad, instrucciones } = await request.json()
    if (!familia) return NextResponse.json({ error: 'familia requerida' }, { status: 400 })
    const nProp = Math.min(Math.max(parseInt(cantidad) || 3, 1), 6)

    // Catálogo existente de la familia, para que el agente detecte huecos.
    const existentes = await prisma.practica.findMany({
      where: { familia, activa: true },
      select: { numero: true, titulo: true, subfamilia: true, objetivo: true, nivel: true },
      orderBy: { numero: 'asc' },
    })

    const listado = existentes.length
      ? existentes.map(e => `- [${e.numero}] ${e.titulo}${e.subfamilia ? ' (' + e.subfamilia + ')' : ''} — nivel ${e.nivel}. Objetivo: ${e.objetivo}`).join('\n')
      : '(No hay prácticas registradas todavía en esta familia.)'

    const promptUsuario = `Familia formativa: "${familia}".

PRÁCTICAS YA EXISTENTES EN EL CATÁLOGO:
${listado}

${instrucciones ? `INDICACIONES ESPECÍFICAS DEL RESPONSABLE:\n${instrucciones}\n\n` : ''}Como experto, detecta huecos y competencias no cubiertas por el catálogo actual y propón ${nProp} práctica(s) NUEVA(S) que lo complementen y amplíen la destreza de los voluntarios. No repitas prácticas existentes; propón las que realmente faltan (por ejemplo, si existe el tendido de mangueras pero no su recogida en simple, doble o palmera, propón esa recogida).

Cada práctica debe ser completa y realista. El campo "materialNecesario" debe ser una lista con los ítems separados por saltos de línea. El "nivel" debe ser "basico", "intermedio" o "avanzado". El "riesgoPractica" debe ser "bajo", "medio" o "alto".

Devuelve SOLO este JSON:
{
  "propuestas": [
    {
      "titulo": "título claro",
      "subfamilia": "subcategoría opcional o cadena vacía",
      "nivel": "basico|intermedio|avanzado",
      "objetivo": "objetivo formativo",
      "descripcion": "descripción general de la práctica",
      "desarrollo": "pasos detallados del desarrollo",
      "materialNecesario": "item 1\\nitem 2\\nitem 3",
      "personalMinimo": 2,
      "duracionEstimada": 45,
      "riesgoPractica": "bajo|medio|alto",
      "riesgoIntervencion": "riesgos durante la ejecución",
      "riesgoObservaciones": "medidas preventivas",
      "prerequisitos": "conocimientos previos o cadena vacía",
      "lugarDesarrollo": "dónde se realiza",
      "conclusiones": "puntos clave de aprendizaje",
      "justificacion": "por qué esta práctica complementa el catálogo actual"
    }
  ]
}`

    const msg = await cliente.messages.create({
      model: MODELO_IA,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: SISTEMA_EXPERTO,
      messages: [{ role: 'user', content: promptUsuario }],
    })

    const parsed = JSON.parse(textoRespuesta(msg))
    return NextResponse.json({ ok: true, familia, propuestas: parsed.propuestas || [] })
  } catch (error: any) {
    console.error('[practicas/ia/generar]', error)
    return NextResponse.json({ error: error.message || 'Error al generar prácticas' }, { status: 500 })
  }
}
