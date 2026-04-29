import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('image') as File
    if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type || 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Analiza este ticket de combustible y extrae los datos en formato JSON. Responde ÚNICAMENTE con el JSON, sin texto adicional ni backticks.
Formato exacto:
{
  "fecha": "YYYY-MM-DD o null",
  "hora": "HH:MM o null",
  "estacion": "nombre de la gasolinera o null",
  "litros": número decimal o null,
  "precioLitro": número decimal o null,
  "importeFinal": número decimal o null,
  "concepto": "EFITEC 95 | EFITEC 98 | DIESEL | DIESEL PLUS | ADBLUE o null"
}`
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Error procesando imagen' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    
    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({ success: true, datos: parsed })
    } catch {
      return NextResponse.json({ error: 'No se pudo extraer datos del ticket' }, { status: 422 })
    }
  } catch (error) {
    console.error('OCR ticket error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
