import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { autorizarIA, crearClienteIA, MODELO_IA, SISTEMA_EXPERTO, textoRespuesta } from '@/lib/ia-formacion'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = await autorizarIA()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const cliente = crearClienteIA()
  if (!cliente) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  try {
    const { practicaId } = await request.json()
    if (!practicaId) return NextResponse.json({ error: 'practicaId requerido' }, { status: 400 })

    const p = await prisma.practica.findUnique({ where: { id: practicaId } })
    if (!p) return NextResponse.json({ error: 'Práctica no encontrada' }, { status: 404 })

    const promptUsuario = `Revisa esta práctica formativa de Protección Civil y evalúa su calidad didáctica, su rigor técnico y su seguridad.

PRÁCTICA:
- Número: ${p.numero}
- Título: ${p.titulo}
- Familia: ${p.familia}${p.subfamilia ? ' / ' + p.subfamilia : ''}
- Nivel: ${p.nivel}
- Objetivo: ${p.objetivo}
- Descripción: ${p.descripcion || '(vacío)'}
- Desarrollo: ${p.desarrollo || '(vacío)'}
- Material necesario: ${p.materialNecesario || '(vacío)'}
- Personal mínimo: ${p.personalMinimo}
- Duración estimada: ${p.duracionEstimada} min
- Riesgo: ${p.riesgoPractica}
- Riesgo intervención: ${p.riesgoIntervencion || '(vacío)'}
- Observaciones de riesgo: ${p.riesgoObservaciones || '(vacío)'}
- Prerequisitos: ${p.prerequisitos || '(vacío)'}
- Lugar de desarrollo: ${p.lugarDesarrollo || '(vacío)'}
- Conclusiones: ${p.conclusiones || '(vacío)'}

Devuelve SOLO este JSON:
{
  "valoracion": "excelente" | "buena" | "mejorable" | "deficiente",
  "resumen": "una o dos frases con la valoración general",
  "fortalezas": ["punto fuerte 1", "..."],
  "carencias": ["carencia o error detectado 1", "..."],
  "riesgosOmitidos": ["riesgo de seguridad no contemplado 1", "..."],
  "mejoras": [
    { "campo": "objetivo|descripcion|desarrollo|materialNecesario|riesgo|conclusiones|otro", "sugerencia": "mejora concreta" }
  ]
}`

    const msg = await cliente.messages.create({
      model: MODELO_IA,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: SISTEMA_EXPERTO,
      messages: [{ role: 'user', content: promptUsuario }],
    })

    const revision = JSON.parse(textoRespuesta(msg))
    return NextResponse.json({ ok: true, practica: { numero: p.numero, titulo: p.titulo }, revision })
  } catch (error: any) {
    console.error('[practicas/ia/revisar]', error)
    return NextResponse.json({ error: error.message || 'Error al revisar la práctica' }, { status: 500 })
  }
}
