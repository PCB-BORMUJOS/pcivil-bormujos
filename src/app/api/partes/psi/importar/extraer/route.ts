import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Analiza este Parte de Servicio e Intervención (PSI) de Protección Civil y extrae todos los datos.
Devuelve ÚNICAMENTE un objeto JSON válido (sin texto adicional, sin bloques de código markdown):

{
  "numeroParte": "número del parte si aparece impreso o escrito (ej: 20260211-001), o null",
  "fecha": "fecha en formato YYYY-MM-DD",
  "hora": "hora general de inicio del servicio en formato HH:MM, o null",
  "lugar": "lugar completo del servicio o intervención",
  "motivo": "motivo o tipo de aviso completo",
  "alertante": "quién alertó o realizó la llamada, o null",
  "horaLlamada": "hora de llamada HH:MM o null",
  "horaSalida": "hora de salida HH:MM o null",
  "horaLlegada": "hora de llegada al lugar HH:MM o null",
  "horaTerminado": "hora en que terminó el servicio HH:MM o null",
  "horaDisponible": "hora de disponibilidad HH:MM o null",
  "vehiculos": ["UMJ", "VIR"],
  "equipo": [
    {"indicativo": "S-01", "walkie": "W01"},
    {"indicativo": "B-03", "walkie": "W02"}
  ],
  "tipologias": {
    "prevencion": {
      "mantenimiento": false,
      "practicas": false,
      "suministros": false,
      "preventivo": false,
      "otros": false
    },
    "intervencion": {
      "svb": false,
      "incendios": false,
      "inundaciones": false,
      "otros_riesgos_meteo": false,
      "activacion_pem_bor": false,
      "otros": false
    },
    "otros": {
      "reunion_coordinacion": false,
      "reunion_areas": false,
      "limpieza": false,
      "formacion": false,
      "otros": false
    }
  },
  "otrosDescripcion": "descripción si se marcó Otros en cualquier categoría, o null",
  "posiblesCausas": "texto de posibles causas si aparece, o null",
  "tieneHeridos": false,
  "numeroHeridos": 0,
  "tieneFallecidos": false,
  "numeroFallecidos": 0,
  "matriculasImplicados": ["", "", "", "", ""],
  "policiaLocal": "municipio de Policía Local si interviene, o null",
  "guardiaCivil": "municipio de Guardia Civil si interviene, o null",
  "descripcionAccidente": "descripción completa del accidente o incidente si aparece, o null",
  "observaciones": "texto completo de las observaciones",
  "desarrolloDetallado": "texto completo del desarrollo detallado si aparece en página 2, o null",
  "indicativoCumplimenta": "indicativo del voluntario que cumplimenta o informa (ej: S-01, B-03, J-44)",
  "responsableTurno": "indicativo del responsable de turno (ej: S-01, J-44)"
}

Reglas estrictas:
- vehiculos: SOLO valores exactos de la lista [UMJ, VIR, FSV, PMA], solo los que aparezcan en el parte
- horaLlamada/horaSalida/horaLlegada/horaTerminado/horaDisponible: formato HH:MM estricto (ej: 09:30) o null
- tipologias: marca true SOLO los que estén marcados con X, tick o similar en el formulario impreso
- tieneHeridos/tieneFallecidos: true si está marcado SÍ, false si NO o si no aparece
- matriculasImplicados: array de exactamente 5 elementos, vacío ("") si no hay matrícula en esa posición
- Copia el texto exacto del documento sin resumir ni parafrasear
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
    console.error('[psi/importar/extraer]', error)
    return NextResponse.json({ error: error.message || 'Error al procesar el PDF' }, { status: 500 })
  }
}
