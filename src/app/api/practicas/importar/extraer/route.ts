import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Analiza esta ficha de práctica de Protección Civil y extrae todos los datos.
Devuelve ÚNICAMENTE un objeto JSON válido (sin texto adicional, sin bloques de código markdown):

{
  "numero": "código único de la práctica (ej: P-001, FSV-01, SVB-03)",
  "titulo": "título completo de la práctica",
  "familia": "área o familia en minúsculas (extincion, rescate, socorrismo, transmisiones, drones, vehiculos, pma, general)",
  "subfamilia": "subfamilia si aparece, o null",
  "objetivo": "objetivo completo de la práctica",
  "descripcion": "descripción general",
  "desarrollo": "procedimiento completo paso a paso",
  "conclusiones": "conclusiones o criterios de evaluación, o null",
  "personalMinimo": 2,
  "materialNecesario": "lista completa de material necesario",
  "riesgoPractica": "bajo",
  "riesgoIntervencion": "riesgo en intervención real, o null",
  "riesgoObservaciones": "observaciones de seguridad, o null",
  "duracionEstimada": 30,
  "nivel": "basico",
  "prerequisitos": "conocimientos o prácticas previas necesarias, o null",
  "grupo": "grupo de voluntarios si se especifica, o null",
  "definicion": "definición técnica si aparece, o null",
  "lugarDesarrollo": "lugar de realización (parque, campo, sala, vía pública, etc.), o null"
}

Reglas estrictas:
- riesgoPractica: SOLO "bajo", "medio" o "alto"
- nivel: SOLO "basico", "intermedio" o "avanzado"
- personalMinimo y duracionEstimada deben ser números enteros positivos
- Copia el texto exacto de la ficha sin resumir ni parafrasear
- Si un campo no aparece en el documento usa null`

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' }, { status: 500 })

  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió el archivo PDF' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfBase64 = buffer.toString('base64')

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          } as any,
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    let texto = ((msg.content[0] as any).text as string).trim()
    texto = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const datos = JSON.parse(texto)
    return NextResponse.json({ ok: true, datos })

  } catch (error: any) {
    console.error('[importar/extraer]', error)
    return NextResponse.json({ error: error.message || 'Error al procesar el PDF' }, { status: 500 })
  }
}
