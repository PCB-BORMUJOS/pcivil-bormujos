import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Modelo del agente experto en formación de emergencias.
export const MODELO_IA = 'claude-opus-4-8'

// Identidad común del agente para prácticas y megacode.
export const SISTEMA_EXPERTO = `Eres un experto especializado en formación de emergencias y Protección Civil en España, con amplia experiencia docente en tendido y recogida de mangueras, primeros auxilios, soporte vital, rescate, uso de EPIs, DEA, extinción de incendios, búsqueda y salvamento, y coordinación operativa.

Tu misión es ayudar a un servicio municipal de Protección Civil a mantener y ampliar su catálogo de prácticas formativas, elevando el nivel de conocimiento y destreza de sus voluntarios.

REGLAS OBLIGATORIAS:
- Responde SIEMPRE en español técnico y profesional apropiado para documentación formativa oficial.
- Basa todo en buenas prácticas reconocidas y seguridad del interviniente. Nunca inventes normativa concreta ni cites artículos legales inexistentes.
- Sé riguroso con la seguridad: identifica riesgos reales y medidas de prevención.
- Cuando generes contenido estructurado, devuelve ÚNICAMENTE JSON válido, sin bloques de código markdown ni texto adicional.`

// Cliente Anthropic o error 500 controlado si falta la clave.
export function crearClienteIA(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

// Comprobación de sesión y rol >= 4 (admin/coordinador). Devuelve la sesión o null.
export async function autorizarIA() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { session: null, error: 'No autorizado', status: 401 as const }
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return { session: null, error: 'Sin permisos suficientes', status: 403 as const }
  }
  return { session, error: null, status: 200 as const }
}

// Extrae el texto de la respuesta y lo limpia de posibles fences markdown.
export function textoRespuesta(msg: Anthropic.Message): string {
  const bloque = msg.content.find(b => b.type === 'text') as { text: string } | undefined
  const texto = (bloque?.text ?? '').trim()
  return texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}
