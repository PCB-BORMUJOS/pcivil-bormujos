import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Analiza este Parte de Servicio e Intervención (PSI) de Protección Civil y extrae todos los datos.
Devuelve ÚNICAMENTE un objeto JSON válido (sin texto adicional, sin bloques de código markdown):

{
  "numeroParte": "número completo del parte TAL COMO APARECE en el documento, incluyendo SIEMPRE el sufijo de intervención. Formato real: YYYYMMDDNNN-X donde NNN es el correlativo del día y X es el número de intervención dentro del turno (1, 2, 3...). Ejemplos correctos: 20260102001-1, 20260102001-2, 20260102001-3. CRÍTICO: NUNCA omitas el sufijo -1, -2, -3 aunque sea el primero (-1). Si ves barra (/) úsala como guión: 20260102001/2 → 20260102001-2. Si no aparece ningún número de parte usa null",
  "fecha": "fecha en formato YYYY-MM-DD",
  "hora": "hora general de inicio del servicio HH:MM o null",
  "lugar": "lugar completo del servicio o intervención",
  "motivo": "motivo o tipo de aviso completo",
  "alertante": "quién alertó o realizó la llamada, o null",

  "horaLlamada": "HH:MM o null",
  "horaSalida": "HH:MM o null",
  "horaLlegada": "HH:MM o null",
  "horaTerminado": "HH:MM o null",
  "horaDisponible": "HH:MM o null",

  "vehiculos": ["UMJ", "VIR"],

  "equipo": [
    {"indicativo": "S-01", "walkie": "W01"},
    {"indicativo": "B-03", "walkie": "W02"}
  ],

  "tipologias": {
    "prevencion": {
      "mantenimiento": false, "practicas": false, "suministros": false,
      "preventivo": false, "otros": false
    },
    "intervencion": {
      "svb": false, "incendios": false, "inundaciones": false,
      "otros_riesgos_meteo": false, "activacion_pem_bor": false, "otros": false
    },
    "otros": {
      "reunion_coordinacion": false, "reunion_areas": false,
      "limpieza": false, "formacion": false, "otros": false
    }
  },
  "otrosDescripcion": "descripción si hay Otros marcado, o null",
  "posiblesCausas": "posibles causas o null",

  "tieneHeridos": false,
  "numeroHeridos": 0,
  "tieneFallecidos": false,
  "numeroFallecidos": 0,

  "matriculasImplicados": ["", "", "", "", ""],
  "policiaLocal": "municipio o null",
  "guardiaCivil": "municipio o null",
  "descripcionAccidente": "descripción del accidente o null",

  "observaciones": "texto completo de las observaciones",

  "introduccion": "párrafo de introducción o contexto inicial del parte. Extrae la primera parte del texto de desarrollo si tiene estructura, o déjalo null si no hay",
  "desarrolloDetallado": "cuerpo principal del desarrollo o relato de los hechos. Extrae TODO el texto narrativo principal sin resumir",
  "conclusion": "conclusión, resolución final o cierre del servicio. Extrae la parte final si la hay, o null",

  "indicativoCumplimenta": "indicativo del voluntario que firma como INFORMANTE en la parte inferior izquierda del formulario (ej: S-01, B-03)",
  "responsableTurno": "indicativo del RESPONSABLE DE TURNO que firma en la parte inferior central (ej: S-02, J-44)"
}

INSTRUCCIONES CRÍTICAS:

EQUIPO Y WALKIES (tabla en la parte superior derecha del formulario):
- El formulario tiene una tabla con columnas EQUIPO y WALKIES
- Puede haber hasta 12 filas de personal (2 grupos de 6)
- Extrae TODOS los indicativos y sus walkies correspondientes
- Los indicativos tienen formato S-01, B-02, J-44, UMJ, VIR, FSV, PMA etc.
- Para los walkies anota el código exacto (W01, WJ01, etc.)
- Si una fila está vacía, no la incluyas

VEHÍCULOS: Solo los valores exactos [UMJ, VIR, FSV, PMA] que aparezcan

NÚMERO DE PARTE — MUY IMPORTANTE:
- El formato es YYYYMMDDNNN-X (sin guión entre la fecha y el correlativo, solo al final)
- X es el número de intervención del turno: -1 primero, -2 segundo, -3 tercero, etc.
- TODOS los partes tienen sufijo: el primero lleva -1, el segundo -2, el tercero -3
- NUNCA omitas el sufijo aunque sea -1
- Sustituye barras por guiones: 20260102001/2 → 20260102001-2
- Ejemplos correctos: 20260102001-1, 20260102001-2, 20260102001-3

TIPOLOGÍAS: marca true SOLO los que tengan X o marca visible en el formulario impreso

TIEMPO: formato HH:MM estricto o null

TEXTO DE DESARROLLO — MUY IMPORTANTE:
- Lee TODO el texto narrativo del campo de desarrollo del formulario
- Reparte el contenido en partes DISTINTAS Y SIN REPETICIÓN entre los tres campos
- "introduccion": SOLO el párrafo o frase inicial que contextualiza el servicio. Si no hay intro claramente diferenciada → null
- "desarrolloDetallado": el CUERPO PRINCIPAL del relato. NO repitas aquí lo que pusiste en introduccion ni lo que irás en conclusion
- "conclusion": SOLO el cierre o resolución final (si existe y es diferente del resto). Si no hay conclusión diferenciada → null
- Si el texto es continuo sin estructura clara → pon TODO en "desarrolloDetallado" y null en los otros DOS campos
- NUNCA copies el mismo párrafo en más de un campo
- La suma de los 3 campos debe reproducir el texto completo sin solapamientos ni omisiones

FIRMAS (parte inferior del formulario):
- Izquierda: INDICATIVO QUE INFORMA → indicativoCumplimenta
- Centro: RESPONSABLE DE TURNO → responsableTurno
- Derecha: VB JEFE DE SERVICIO (siempre J-44, no hace falta extraer)
- Copia el indicativo exacto que aparezca impreso o escrito junto a cada firma

Si un campo no aparece en el documento usa null`

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

    // Normalizar numeroParte: reemplazar / por - si Claude no lo hizo
    if (datos.numeroParte && typeof datos.numeroParte === 'string') {
      datos.numeroParte = datos.numeroParte.replace(/\//g, '-')
    }

    return NextResponse.json({ ok: true, datos })

  } catch (error: any) {
    console.error('[psi/importar/extraer]', error)
    return NextResponse.json({ error: error.message || 'Error al procesar el PDF' }, { status: 500 })
  }
}
