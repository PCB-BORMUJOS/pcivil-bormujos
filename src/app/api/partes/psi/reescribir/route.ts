import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT_SISTEMA = `Eres un redactor profesional especializado en partes de servicio de Protección Civil española.
Tu tarea es reescribir el texto de un parte de servicio e intervención (PSI) de forma clara, profesional y correcta.

REGLAS OBLIGATORIAS:
- Escribe en español formal y técnico apropiado para un documento oficial de Protección Civil
- Mantén TODOS los datos factuales (horas, lugares, nombres, matrículas, tipologías)
- Elimina expresiones coloquiales, errores gramaticales y redacción amateur
- Usa tercera persona impersonal ("Se recibió aviso...", "El equipo procedió a...", "Se efectuó...")
- Estructura el texto con coherencia y fluidez narrativa
- No inventes datos que no estén en el texto original
- Si el campo está vacío o no hay información suficiente, devuélvelo como cadena vacía ""
- Devuelve ÚNICAMENTE un JSON válido sin bloques de código markdown`

const PROMPT_USUARIO = (datos: {
  lugar: string
  motivo: string
  alertante: string
  tipologias: string
  observaciones: string
  introduccion: string
  desarrolloDetallado: string
  conclusion: string
}) => `Reescribe profesionalmente este parte de servicio PSI de Protección Civil.

DATOS DEL SERVICIO:
- Lugar: ${datos.lugar || 'No indicado'}
- Motivo: ${datos.motivo || 'No indicado'}
- Alertante: ${datos.alertante || 'No indicado'}
- Tipología: ${datos.tipologias || 'No indicado'}

TEXTO ORIGINAL A REESCRIBIR:

OBSERVACIONES: ${datos.observaciones || '(vacío)'}

INTRODUCCIÓN: ${datos.introduccion || '(vacío)'}

DESARROLLO DETALLADO: ${datos.desarrolloDetallado || '(vacío)'}

CONCLUSIÓN: ${datos.conclusion || '(vacío)'}

Devuelve SOLO este JSON con los textos reescritos:
{
  "observaciones": "texto reescrito de observaciones",
  "introduccion": "párrafo introductorio reescrito",
  "desarrolloDetallado": "desarrollo principal reescrito con todos los detalles",
  "conclusion": "conclusión reescrita"
}`

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  try {
    const body = await request.json()
    const { lugar = '', motivo = '', alertante = '', tipologias = '', observaciones = '', introduccion = '', desarrolloDetallado = '', conclusion = '' } = body

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: PROMPT_SISTEMA,
      messages: [{
        role: 'user',
        content: PROMPT_USUARIO({ lugar, motivo, alertante, tipologias, observaciones, introduccion, desarrolloDetallado, conclusion }),
      }],
    })

    let texto = ((msg.content[0] as any).text as string).trim()
    texto = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const resultado = JSON.parse(texto)

    return NextResponse.json({ ok: true, resultado })
  } catch (error: any) {
    console.error('[psi/reescribir]', error)
    return NextResponse.json({ error: error.message || 'Error al reescribir el parte' }, { status: 500 })
  }
}
