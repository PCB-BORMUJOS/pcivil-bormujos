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
    if (tipo === 'stats') {
      const [totalDrones, dronesOperativos, totalPilotos, vuelosMes, totalVuelos, bateriasAlerta, mantPendientes] = await Promise.all([
        prisma.drone.count(),
        prisma.drone.count({ where: {} }),
        prisma.pilotoDrone.count({ where: { activo: true } }),
        prisma.vuelo.count({ where: { fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
        prisma.vuelo.count(),
        prisma.bateriaDrone.count({ where: { estado: { in: ['degradada', 'baja'] } } }),
        prisma.mantenimientoDrone.count({ where: {} }),
      ])
      const horasResult = await prisma.vuelo.aggregate({ _sum: { duracionMinutos: true } })
      const horasTotales = Math.round((horasResult._sum.duracionMinutos || 0) / 60)
      return NextResponse.json({ stats: { totalDrones, dronesOperativos, totalPilotos, vuelosMes, totalVuelos, horasTotales, bateriasAlerta, mantPendientes } })
    }

    if (tipo === 'drones') {
      const drones = await prisma.drone.findMany({
        include: { baterias: true, mantenimientos: { orderBy: { fecha: 'desc' }, take: 1 }, _count: { select: { vuelos: true } } },
        orderBy: { codigo: 'asc' }
      })
      return NextResponse.json({ drones })
    }

    if (tipo === 'pilotos') {
      const pilotos = await prisma.pilotoDrone.findMany({ orderBy: { apellidos: 'asc' } })
      return NextResponse.json({ pilotos })
    }

    if (tipo === 'vuelos') {
      const vuelos = await prisma.vuelo.findMany({
        include: { drone: true, piloto: true, checklist: true },
        orderBy: { fecha: 'desc' },
        take: 100
      })
      return NextResponse.json({ vuelos })
    }

    if (tipo === 'mantenimientos') {
      const mantenimientos = await prisma.mantenimientoDrone.findMany({
        include: { drone: true },
        orderBy: { fecha: 'desc' }
      })
      return NextResponse.json({ mantenimientos })
    }

    if (tipo === 'notams') {
      const notams = await prisma.notamRegistro.findMany({
        where: { activo: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ notams })
    }

    if (tipo === 'zonas') {
      return NextResponse.json({ zonas: [] })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error API drones GET:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const { tipo, ...data } = body

    if (tipo === 'drone') {
      const drone = await prisma.drone.create({
        data: {
          codigo: data.codigo, nombre: data.nombre, marca: data.marca,
          modelo: data.modelo, numeroSerie: data.numeroSerie,
          matriculaAESA: data.matriculaAESA, categoria: data.categoria,
          pesoGramos: data.pesoMaxDespegue ? parseFloat(data.pesoMaxDespegue) : null,
          estado: data.estado || 'operativo',
          fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : null,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ drone })
    }

    if (tipo === 'piloto') {
      const piloto = await prisma.pilotoDrone.create({
        data: {
          nombre: data.nombre, apellidos: data.apellidos,
          email: data.email, telefono: data.telefono,
          esExterno: data.externo || false,
          certificaciones: data.certificaciones ? [JSON.stringify(data.certificaciones)] : [],
          seguroRCNumero: data.seguroRCNumero,
          seguroRCVigencia: data.seguroRCVigencia ? new Date(data.seguroRCVigencia) : null,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ piloto })
    }

    if (tipo === 'vuelo') {
      const count = await prisma.vuelo.count()
      const numero = `VUE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
      const vuelo = await prisma.vuelo.create({
        data: {
          numero,
          droneId: data.droneId, pilotoId: data.pilotoId,
          fecha: new Date(data.fecha),
          horaInicio: data.horaInicio, tipoOperacion: data.tipoOperacion,
          municipio: data.municipio || 'Bormujos',
          descripcionZona: data.descripcionZona,
          latitudInicio: data.latitudInicio ? parseFloat(data.latitudInicio) : null,
          longitudInicio: data.longitudInicio ? parseFloat(data.longitudInicio) : null,
          alturaMaxima: data.alturaMaxima ? parseFloat(data.alturaMaxima) : null,
          condicionesMeteo: data.condicionesMeteo || {},
          notamConsultado: data.notamConsultado || false,
          notamReferencia: data.notamReferencia,
          observaciones: data.observaciones,
          estado: data.estado || 'planificado',
        }
      })
      return NextResponse.json({ vuelo })
    }

    if (tipo === 'checklist') {
      const checklist = await prisma.checklistVuelo.create({
        data: {
          vueloId: data.vueloId,
          items: data.items || [],
          completado: data.completado || false,
          firmadoPor: data.firmadoPor,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ checklist })
    }

    if (tipo === 'mantenimiento') {
      const mant = await prisma.mantenimientoDrone.create({
        data: {
          droneId: data.droneId, tipo: data.tipoMant,
          descripcion: data.descripcion,
          fecha: new Date(data.fecha),
          horasEnElMomento: data.horasEnElMomento ? parseFloat(data.horasEnElMomento) : null,
          realizadoPor: data.realizadoPor,
          coste: data.coste ? parseFloat(data.coste) : null,
          piezasSustituidas: data.piezasSustituidas,
          proximoMantenimiento: data.proximoMantenimiento ? new Date(data.proximoMantenimiento) : null,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ mantenimiento: mant })
    }

    if (tipo === 'notam') {
      const notam = await prisma.notamRegistro.create({
        data: {
          referencia: data.referencia, tipo: data.tipo,
          descripcion: data.descripcion,
          fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          alturaMin: data.alturaMin ? parseFloat(data.alturaMin) : null,
          alturaMax: data.alturaMax ? parseFloat(data.alturaMax) : null,
          latitud: data.latitud ? parseFloat(data.latitud) : null,
          longitud: data.longitud ? parseFloat(data.longitud) : null,
          fuente: 'manual', activo: true,
        }
      })
      return NextResponse.json({ notam })
    }

    if (tipo === 'bateria') {
      const bateria = await prisma.bateriaDrone.create({
        data: {
          droneId: data.droneId,
          codigo: data.codigo,
          capacidadMah: data.capacidadMah ? parseInt(data.capacidadMah) : null,
          ciclosMaximos: data.ciclosMaximos ? parseInt(data.ciclosMaximos) : 200,
          ciclosUso: 0,
          estado: data.estado || 'buena',
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ bateria })
    }

    if (tipo === 'notam-manual') {
      const notam = await prisma.notamRegistro.create({
        data: {
          referencia: data.referencia,
          tipo: data.tipoNotam,
          descripcion: data.descripcion,
          fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          alturaMin: data.alturaMin ? parseFloat(data.alturaMin) : null,
          alturaMax: data.alturaMax ? parseFloat(data.alturaMax) : null,
          radio: data.radio ? parseFloat(data.radio) : null,
          latitud: data.latitud ? parseFloat(data.latitud) : null,
          longitud: data.longitud ? parseFloat(data.longitud) : null,
          fuente: 'manual',
          activo: true,
        }
      })
      return NextResponse.json({ notam })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error API drones POST:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const { tipo, id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })


    if (tipo === 'piloto') {
      const certs = data.certificaciones
      const piloto = await prisma.pilotoDrone.update({
        where: { id: data.id },
        data: {
          nombre: data.nombre, apellidos: data.apellidos,
          email: data.email, telefono: data.telefono,
          esExterno: data.esExterno || false,
          certificaciones: certs ? [JSON.stringify(certs)] : [],
          seguroRCNumero: data.seguroRCNumero,
          seguroRCVigencia: data.seguroRCVigencia ? new Date(data.seguroRCVigencia) : null,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ piloto })
    }
    if (tipo === 'drone') {
      const drone = await prisma.drone.update({
        where: { id },
        data: {
          codigo: data.codigo, nombre: data.nombre, marca: data.marca,
          modelo: data.modelo, numeroSerie: data.numeroSerie,
          matriculaAESA: data.matriculaAESA, categoria: data.categoria,
          pesoGramos: data.pesoMaxDespegue ? parseFloat(data.pesoMaxDespegue) : null,
          estado: data.estado,
          fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : null,
          observaciones: data.observaciones,
        }
      })
      return NextResponse.json({ drone })
    }

    if (tipo === 'vuelo') {
      const vuelo = await prisma.vuelo.update({
        where: { id },
        data: { estado: data.estado, horaFin: data.horaFin, duracionMinutos: data.duracionMinutos ? parseInt(data.duracionMinutos) : null, incidencias: data.incidencias, observaciones: data.observaciones }
      })
      return NextResponse.json({ vuelo })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error API drones PUT:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (tipo === 'drone') {
      await prisma.drone.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    if (tipo === 'piloto') {
      await prisma.pilotoDrone.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error DELETE drones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
