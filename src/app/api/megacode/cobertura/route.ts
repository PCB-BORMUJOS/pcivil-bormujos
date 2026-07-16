import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catalogoPracticas, practicasRealizadasPorUsuario } from '@/lib/practicas-cobertura'

// POST /api/megacode/cobertura
// body: { usuarioIds: string[] }
// Devuelve la matriz de cobertura del grupo: por cada práctica del catálogo,
// quién la ha realizado, y las carencias comunes del grupo (nadie la ha hecho).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { usuarioIds } = await request.json()
    if (!Array.isArray(usuarioIds) || usuarioIds.length === 0) {
      return NextResponse.json({ error: 'usuarioIds requerido' }, { status: 400 })
    }

    const [catalogo, mapa, usuarios] = await Promise.all([
      catalogoPracticas(),
      practicasRealizadasPorUsuario(usuarioIds),
      prisma.usuario.findMany({
        where: { id: { in: usuarioIds } },
        select: { id: true, numeroVoluntario: true, nombre: true, apellidos: true },
      }),
    ])

    const matriz = catalogo.map(p => {
      const hechaPor = usuarioIds.filter(uid => mapa.get(uid)?.has(p.id))
      return {
        practica: p,
        hechaPor,
        nHechaPor: hechaPor.length,
        total: usuarioIds.length,
        carenciaComun: hechaPor.length === 0,
      }
    })

    return NextResponse.json({
      usuarios,
      matriz,
      carenciasComunes: matriz.filter(m => m.carenciaComun).map(m => m.practica),
    })
  } catch (error: any) {
    console.error('[megacode/cobertura]', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
