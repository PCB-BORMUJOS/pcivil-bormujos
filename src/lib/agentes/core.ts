// Motor común de los agentes especializados por área.

import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const MODELO_AGENTE = 'claude-opus-4-8'

const NIVEL: Record<string, number> = {
  superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0,
}

export function crearCliente(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  return apiKey ? new Anthropic({ apiKey }) : null
}

/** Sesión + usuario en BD. Cualquier usuario autenticado puede conversar. */
export async function autorizar(nivelMinimo = 1) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return { usuario: null, nivel: 0, error: 'No autorizado', status: 401 as const }
  const rol = (session.user as any)?.rol ?? 'voluntario'
  const nivel = NIVEL[rol] ?? 1
  if (nivel < nivelMinimo) return { usuario: null, nivel, error: 'Sin permisos suficientes', status: 403 as const }
  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, nombre: true, apellidos: true, fichaVoluntario: { select: { indicativo2: true, areaAsignada: true } } },
  })
  if (!usuario) return { usuario: null, nivel, error: 'Usuario no encontrado', status: 404 as const }
  return { usuario, nivel, error: null, status: 200 as const }
}

/** Texto plano de la respuesta del modelo, sin fences markdown. */
export function textoRespuesta(msg: Anthropic.Message): string {
  const bloque = msg.content.find(b => b.type === 'text') as { text: string } | undefined
  return (bloque?.text ?? '').trim()
}

/** Igual que textoRespuesta pero preparado para JSON.parse. */
export function jsonRespuesta<T>(msg: Anthropic.Message): T | null {
  const texto = textoRespuesta(msg).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(texto) as T
  } catch {
    // Rescate: primer objeto JSON que aparezca en el texto.
    const inicio = texto.indexOf('{')
    const fin = texto.lastIndexOf('}')
    if (inicio >= 0 && fin > inicio) {
      try { return JSON.parse(texto.slice(inicio, fin + 1)) as T } catch { return null }
    }
    return null
  }
}

const CATEGORIAS = ['dato_incompleto', 'incoherencia', 'caducidad', 'seguridad', 'procedimiento', 'mejora']
const PRIORIDADES = ['baja', 'media', 'alta', 'critica']

export function normalizarPropuesta(p: any) {
  return {
    titulo: String(p?.titulo || '').slice(0, 200),
    descripcion: String(p?.descripcion || '').slice(0, 4000),
    justificacion: p?.justificacion ? String(p.justificacion).slice(0, 2000) : null,
    categoria: CATEGORIAS.includes(p?.categoria) ? p.categoria : 'mejora',
    prioridad: PRIORIDADES.includes(p?.prioridad) ? p.prioridad : 'media',
    modulo: p?.modulo ? String(p.modulo).slice(0, 100) : null,
    referencia: p?.referencia ? String(p.referencia).slice(0, 200) : null,
  }
}
