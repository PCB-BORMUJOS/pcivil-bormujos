import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { autorizarIA, crearClienteIA, MODELO_IA, SISTEMA_EXPERTO, textoRespuesta } from '@/lib/ia-formacion'
import { catalogoPracticas, practicasRealizadasPorUsuario } from '@/lib/practicas-cobertura'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const auth = await autorizarIA()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const cliente = crearClienteIA()
  if (!cliente) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  try {
    const { cantidad, instrucciones, nivel, participantes } = await request.json()
    const nProp = Math.min(Math.max(parseInt(cantidad) || 2, 1), 4)

    // Catálogo de prácticas disponibles para encadenar en los escenarios.
    const practicas = await catalogoPracticas()

    if (practicas.length === 0) {
      return NextResponse.json({ error: 'No hay prácticas en el catálogo para componer escenarios' }, { status: 400 })
    }

    const catalogo = practicas
      .map(p => `- [${p.numero}] ${p.titulo} — familia ${p.familia}, nivel ${p.nivel}`)
      .join('\n')

    // Si se indican participantes, calcular sus carencias comunes para dirigir
    // el megacode hacia lo que el grupo aún NO ha practicado.
    let bloqueCarencias = ''
    const ids: string[] = Array.isArray(participantes) ? participantes.filter((x: any) => typeof x === 'string') : []
    if (ids.length > 0) {
      const mapa = await practicasRealizadasPorUsuario(ids)
      const carencias = practicas.filter(p => !ids.some(uid => mapa.get(uid)?.has(p.id)))
      if (carencias.length > 0) {
        bloqueCarencias = `\nCARENCIAS DEL GRUPO (prácticas que NINGUNO de los ${ids.length} participantes seleccionados ha realizado todavía — prioriza entrenarlas):\n${carencias.map(p => `- [${p.numero}] ${p.titulo}`).join('\n')}\n`
      } else {
        bloqueCarencias = `\n(El grupo seleccionado ya ha practicado todo el catálogo; propón escenarios de refuerzo y mayor complejidad.)\n`
      }
    }

    const promptUsuario = `Un megacode es un escenario de simulacro integral que encadena varias prácticas formativas para entrenar una respuesta operativa completa y realista.

CATÁLOGO DE PRÁCTICAS DISPONIBLES (usa sus números para componer las secuencias):
${catalogo}
${bloqueCarencias}
${nivel ? `Nivel de dificultad objetivo: ${nivel}.\n` : ''}${instrucciones ? `INDICACIONES DEL RESPONSABLE:\n${instrucciones}\n\n` : ''}Como experto, propón ${nProp} escenario(s) de megacode que combinen de forma coherente prácticas del catálogo anterior, formando simulacros progresivos y realistas que amplíen la destreza operativa.${bloqueCarencias ? ' Da prioridad a las carencias del grupo indicadas arriba.' : ''} Encadena solo prácticas que existan en el catálogo, referenciándolas por su número exacto.

Devuelve SOLO este JSON:
{
  "escenarios": [
    {
      "titulo": "nombre del escenario",
      "nivelDificultad": "bajo|medio|alto",
      "escenario": "narrativa del incidente o situación simulada",
      "objetivos": "objetivos formativos del megacode",
      "recursos": "recursos y medios necesarios",
      "leccionesAprendidas": "aprendizajes esperados",
      "practicas": ["NUM-001", "NUM-002"],
      "justificacion": "por qué esta combinación entrena una respuesta operativa completa"
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
    const escenarios = parsed.escenarios || []

    // Mapear números de práctica a IDs reales; descartar los que no existan.
    const porNumero = new Map(
      (await prisma.practica.findMany({ where: { activa: true }, select: { id: true, numero: true, titulo: true } }))
        .map(p => [p.numero, p])
    )
    const escenariosResueltos = escenarios.map((e: any) => {
      const practicasResueltas = (e.practicas || [])
        .map((num: string) => porNumero.get(num))
        .filter(Boolean)
      return { ...e, practicas: practicasResueltas }
    })

    return NextResponse.json({ ok: true, escenarios: escenariosResueltos })
  } catch (error: any) {
    console.error('[megacode/ia/generar]', error)
    return NextResponse.json({ error: error.message || 'Error al generar escenarios' }, { status: 500 })
  }
}
