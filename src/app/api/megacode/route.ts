import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  try {
    if (tipo === 'lista') {
      const megacodes = await prisma.megacode.findMany({
        orderBy: { fecha: 'desc' },
        take: 20,
        include: {
          practicas: {
            include: { practica: { select: { titulo: true, numero: true, familia: true, duracionEstimada: true } } },
            orderBy: { orden: 'asc' }
          },
          participaciones: {
            include: { usuario: { select: { nombre: true, apellidos: true, numeroVoluntario: true } } }
          }
        }
      })
      return NextResponse.json({ megacodes })
    }
    if (tipo === 'generar') {
      const turno = searchParams.get('turno') || 'manana'
      const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]
      const tiempoDisponible = parseInt(searchParams.get('tiempo') || '90')
      const participantesIds = searchParams.get('participantes')?.split(',').filter(Boolean) || []

      const todasPracticas = await prisma.practica.findMany({
        where: { activa: true },
        select: {
          id: true, numero: true, titulo: true, familia: true,
          nivel: true, duracionEstimada: true, personalMinimo: true,
          prerequisitos: true,
          registros: { select: { id: true, participantes: true } }
        }
      })

      const numParticipantes = participantesIds.length || 4

      // Filtrar por personal mínimo
      const practicasValidas = todasPracticas.filter(p => p.personalMinimo <= numParticipantes)

      // Contar realizaciones por práctica para este equipo
      const practicasConPeso = practicasValidas.map(p => {
        const vecesRealizadas = p.registros.length
        const vecesConEsteEquipo = p.registros.filter(r => {
          const parts = r.participantes as string[]
          return participantesIds.length === 0 || participantesIds.some(id => parts.includes(id))
        }).length
        return {
          ...p,
          peso: vecesConEsteEquipo * 3 + vecesRealizadas,
          vecesRealizadas,
          vecesConEsteEquipo
        }
      })

      // Ordenar por menos realizadas primero
      practicasConPeso.sort((a, b) => a.peso - b.peso)

      // Seleccionar prácticas balanceando familias
      const seleccionadas: typeof practicasConPeso = []
      const familiasUsadas: Record<string, number> = {}
      let tiempoAcumulado = 0

      for (const p of practicasConPeso) {
        if (seleccionadas.length >= 4) break
        if (tiempoAcumulado + p.duracionEstimada > tiempoDisponible) continue
        const usosEsteFamilia = familiasUsadas[p.familia] || 0
        if (usosEsteFamilia >= 2) continue
        seleccionadas.push(p)
        familiasUsadas[p.familia] = usosEsteFamilia + 1
        tiempoAcumulado += p.duracionEstimada
      }

      // Si no llegamos a 3, relajar restricción de familia
      if (seleccionadas.length < 3) {
        for (const p of practicasConPeso) {
          if (seleccionadas.find(s => s.id === p.id)) continue
          if (seleccionadas.length >= 4) break
          if (tiempoAcumulado + p.duracionEstimada > tiempoDisponible + 30) continue
          seleccionadas.push(p)
          tiempoAcumulado += p.duracionEstimada
        }
      }

      return NextResponse.json({
        practicas: seleccionadas.map((p, i) => ({
          orden: i + 1, practicaId: p.id, numero: p.numero,
          titulo: p.titulo, familia: p.familia,
          duracionEstimada: p.duracionEstimada, nivel: p.nivel,
          vecesRealizadas: p.vecesRealizadas,
          vecesConEsteEquipo: p.vecesConEsteEquipo
        })),
        tiempoTotal: tiempoAcumulado,
        fecha, turno
      })
    }
    return NextResponse.json({ error: 'tipo requerido' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const count = await prisma.megacode.count()
    const numero = `MCG-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
    const megacode = await prisma.megacode.create({
      data: {
        numero,
        fecha: new Date(body.fecha),
        turno: body.turno,
        estado: 'pendiente',
        generadoAuto: body.generadoAuto || false,
        observaciones: body.observaciones || null,
        practicas: {
          create: (body.practicas || []).map((p: any) => ({
            practicaId: p.practicaId,
            orden: p.orden,
            completada: false
          }))
        },
        participaciones: {
          create: (body.participantes || []).map((uid: string) => ({
            usuarioId: uid,
            resultado: 'pendiente'
          }))
        }
      },
      include: {
        practicas: { include: { practica: { select: { titulo: true, numero: true } } } },
        participaciones: { include: { usuario: { select: { nombre: true, apellidos: true } } } }
      }
    })
    return NextResponse.json({ megacode })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, practicaId, completada, tiempoReal, observaciones, estado } = body
    if (practicaId) {
      await prisma.megacodePractica.updateMany({
        where: { megacodeId: id, practicaId },
        data: { completada, tiempoReal, observaciones }
      })
    }
    if (estado) {
      await prisma.megacode.update({ where: { id }, data: { estado } })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
