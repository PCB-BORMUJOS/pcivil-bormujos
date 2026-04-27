import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(rol)) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const mes = searchParams.get('mes') // formato: 2025-01

    // GET informes de dietas
    if (tipo === 'informes') {
      const anio = searchParams.get('anio') || new Date().getFullYear().toString()
      const informes = await prisma.informeDietas.findMany({
        where: { mes: { startsWith: anio } },
        include: { partida: { select: { codigo: true, denominacion: true, importeAsignado: true, importeEjecutado: true } } },
        orderBy: { mes: 'desc' }
      })
      return NextResponse.json({ informes })
    }

    if (!mes) {
      return NextResponse.json({ error: 'Mes requerido' }, { status: 400 })
    }

    // Obtener dietas del mes
    const dietas = await prisma.dieta.findMany({
      where: { mesAnio: mes },
      include: {
        usuario: {
          select: {
            numeroVoluntario: true,
            nombre: true,
            apellidos: true
          }
        }
      },
      orderBy: { fecha: 'asc' }
    })

    // Calcular resumen por voluntario
    const resumenMap = new Map<string, any>()
    
    dietas.forEach(d => {
      const key = d.usuarioId
      if (!resumenMap.has(key)) {
        resumenMap.set(key, {
          indicativo: d.usuario.numeroVoluntario,
          nombre: d.usuario.nombre,
          apellidos: d.usuario.apellidos,
          dias: 0,
          subtotalDietas: 0,
          subtotalKm: 0,
          totalDietas: 0
        })
      }
      const r = resumenMap.get(key)
      r.dias += 1
      r.subtotalDietas += Number(d.subtotalDietas)
      r.subtotalKm += Number(d.subtotalKm)
      r.totalDietas += Number(d.totalDieta)
    })

    const resumen = Array.from(resumenMap.values()).sort((a, b) => 
      (a.indicativo || '').localeCompare(b.indicativo || '')
    )

    return NextResponse.json({ dietas, resumen })
  } catch (error) {
    console.error('Error al obtener dietas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if (!['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(rol)) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // POST crear informe mensual
    if (body.tipo === 'informe') {
      const { mes, fechaPresentacion, totalDietas, subtotalDietas, subtotalKm, numVoluntarios, numDias, partidaId, notas, firmadoPor } = body
      // Verificar que no existe ya un informe para este mes
      const existente = await prisma.informeDietas.findFirst({ where: { mes } })
      if (existente) {
        return NextResponse.json({ error: 'Ya existe un informe para este mes' }, { status: 400 })
      }
      const informe = await prisma.informeDietas.create({
        data: {
          mes,
          fechaPresentacion: new Date(fechaPresentacion),
          totalDietas: parseFloat(totalDietas),
          subtotalDietas: parseFloat(subtotalDietas),
          subtotalKm: parseFloat(subtotalKm),
          numVoluntarios: parseInt(numVoluntarios) || 0,
          numDias: parseInt(numDias) || 0,
          partidaId: partidaId || null,
          notas: notas || null,
          firmadoPor: firmadoPor || null,
          estado: 'presentado'
        }
      })
      // Actualizar importeEjecutado en la partida presupuestaria
      if (partidaId) {
        const partida = await prisma.partidaPresupuestaria.findUnique({ where: { id: partidaId } })
        if (partida) {
          await prisma.partidaPresupuestaria.update({
            where: { id: partidaId },
            data: { importeEjecutado: Number(partida.importeEjecutado) + parseFloat(totalDietas) }
          })
          // Recalcular totalAprobado del presupuesto padre
          const todasPartidas = await prisma.partidaPresupuestaria.findMany({ where: { presupuestoId: partida.presupuestoId } })
          const nuevoTotal = todasPartidas.reduce((s, p) => s + Number(p.importeAsignado), 0)
          await prisma.presupuestoAnual.update({ where: { id: partida.presupuestoId }, data: { totalAprobado: nuevoTotal } })
        }
      }
      const { usuarioId: uid, usuarioNombre: unom } = require('@/lib/audit').getUsuarioAudit ? { usuarioId: '', usuarioNombre: '' } : { usuarioId: '', usuarioNombre: '' }
      return NextResponse.json({ success: true, informe })
    }

    const { usuarioId, fecha, turno, horasTrabajadas, kilometros } = body

    const importeDia = 29.45
    const importeKm = 0.19
    const subtotalDietas = importeDia
    const subtotalKm = (kilometros || 0) * importeKm
    const totalDieta = subtotalDietas + subtotalKm

    const fechaObj = new Date(fecha)
    const mesAnio = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`

    const dieta = await prisma.dieta.create({
      data: {
        usuarioId,
        fecha: fechaObj,
        turno,
        horasTrabajadas: horasTrabajadas || 7,
        importeDia,
        subtotalDietas,
        kilometros: Number(kilometros || 0),
        importeKm,
        subtotalKm,
        totalDieta,
        mesAnio,
        estado: 'pendiente'
      }
    })

    return NextResponse.json({ success: true, dieta })
  } catch (error) {
    console.error('Error al crear dieta:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}