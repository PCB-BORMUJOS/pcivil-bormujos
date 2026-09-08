import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { autorizarIA, crearClienteIA, MODELO_IA, textoRespuesta } from '@/lib/ia-formacion'
import { PERFILES } from '@/lib/agentes/perfiles'

export const maxDuration = 120

// Mapea la familia de la práctica al agente especialista de su área.
const FAMILIA_A_SLUG: Record<string, string> = {
  socorrismo: 'socorrismo',
  incendios: 'incendios',
  rescate: 'incendios',      // el agente de Incendios cubre tráfico, altura y confinados
  transmisiones: 'transmisiones',
  drones: 'drones',
  pma: 'pma',
  vehiculos: 'vehiculos',
  general: 'general',
}

export async function POST(request: NextRequest) {
  const auth = await autorizarIA()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })
  // Solo admin y superadmin pueden ampliar contenido con el agente.
  const rol = (auth.session.user as any)?.rol
  if (rol !== 'admin' && rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo administración puede ampliar prácticas con IA' }, { status: 403 })
  }

  const cliente = crearClienteIA()
  if (!cliente) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  try {
    const { practicaId } = await request.json()
    if (!practicaId) return NextResponse.json({ error: 'practicaId requerido' }, { status: 400 })

    const p = await prisma.practica.findUnique({ where: { id: practicaId } })
    if (!p) return NextResponse.json({ error: 'Práctica no encontrada' }, { status: 404 })

    const slug = FAMILIA_A_SLUG[p.familia] || 'general'
    const perfil = PERFILES.find(x => x.slug === slug) || PERFILES.find(x => x.slug === 'general')!

    const sistema = `${perfil.persona}

Ahora actúas como redactor técnico de una FICHA DE PRÁCTICA para el personal de Protección Civil de Bormujos. Escribe con rigor profesional y en español de España, a nivel operativo (quien la lee ya conoce lo básico; ve al detalle útil). No inventes normativa ni datos que no correspondan; si algo es orientativo, indícalo. Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto alrededor ni bloques de código.`

    const promptUsuario = `Ficha de práctica actual (familia: ${p.familia}${p.subfamilia ? ', ' + p.subfamilia : ''}):

TÍTULO: ${p.titulo}
OBJETIVO: ${p.objetivo || '(vacío)'}
DEFINICIÓN: ${p.definicion || '(vacío)'}
DESCRIPCIÓN: ${p.descripcion || '(vacío)'}
DESARROLLO: ${p.desarrollo || '(vacío)'}
MATERIAL NECESARIO: ${p.materialNecesario || '(vacío)'}
RIESGO DE LA PRÁCTICA: ${p.riesgoPractica || '(vacío)'}
MEDIDAS PREVENTIVAS: ${p.riesgoObservaciones || '(vacío)'}
RIESGOS DE LA INTERVENCIÓN: ${p.riesgoIntervencion || '(vacío)'}
CONCLUSIONES: ${p.conclusiones || '(vacío)'}

Completa y AMPLÍA cada apartado a nivel experto, respetando y mejorando lo que ya haya y rellenando lo que falte. Formato:
- "desarrollo": empieza con un PÁRRAFO DESCRIPTIVO (un relato breve que hile y dé sentido a la secuencia de la práctica), y a continuación los PASOS numerados, uno por línea, empezando cada paso con su número (por ejemplo "1. ...", "2. ..."). El relato va antes de los pasos y sin numerar.
- "materialNecesario": UN material por línea; añade cantidad si procede (p. ej. "DEA de entrenamiento x1").
- "conclusiones": UNA idea clave por línea.
- "riesgoPractica": exactamente uno de "bajo", "medio" o "alto".
- El resto en prosa clara y concisa.

Devuelve SOLO este JSON:
{
  "objetivo": "...",
  "descripcion": "...",
  "desarrollo": "línea1\\nlínea2\\n...",
  "materialNecesario": "item1\\nitem2\\n...",
  "riesgoPractica": "bajo|medio|alto",
  "riesgoObservaciones": "...",
  "riesgoIntervencion": "...",
  "conclusiones": "línea1\\nlínea2\\n..."
}`

    const msg = await cliente.messages.create({
      model: MODELO_IA,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: sistema,
      messages: [{ role: 'user', content: promptUsuario }],
    } as any)

    let texto = textoRespuesta(msg).trim()
    // Por si el modelo envuelve el JSON en un bloque de código.
    texto = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const propuesta = JSON.parse(texto)

    return NextResponse.json({ ok: true, agente: perfil.nombre, propuesta })
  } catch (error: any) {
    console.error('[practicas/ia/ampliar]', error)
    return NextResponse.json({ error: error?.message || 'Error al ampliar la práctica' }, { status: 500 })
  }
}
