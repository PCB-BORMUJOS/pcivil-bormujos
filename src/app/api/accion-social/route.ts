import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    if (tipo === 'espacios') {
      const espacios = await prisma.espacioAcogida.findMany({ orderBy: { nombre: 'asc' } })
      return NextResponse.json({ espacios })
    }
    if (tipo === 'centros') {
      const centros = await prisma.centroEmergencia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } })
      return NextResponse.json({ centros })
    }
    if (tipo === 'directorio') {
      const categoria = searchParams.get('categoria')
      const contactos = await prisma.contactoDirectorio.findMany({
        where: { activo: true, ...(categoria && categoria !== 'all' ? { categoria } : {}) },
        orderBy: { nombre: 'asc' }
      })
      return NextResponse.json({ contactos })
    }
    if (tipo === 'viogen') {
      const estado = searchParams.get('estado')
      const casos = await prisma.casoViogen.findMany({
        where: estado && estado !== 'all' ? { estado } : {},
        orderBy: { fechaIntervencion: 'desc' }
      })
      return NextResponse.json({ casos })
    }
    if (tipo === 'viogen-check-dni') {
      const dni = searchParams.get('dni')
      if (!dni) return NextResponse.json({ casos: [] })
      const casos = await prisma.casoViogen.findMany({
        where: { victimaDni: { contains: dni, mode: 'insensitive' } },
        orderBy: { fechaIntervencion: 'desc' }
      })
      return NextResponse.json({ casos, reincidente: casos.length > 0 })
    }
    if (tipo === 'stats') {
      const [espacios, centros, contactos, casosActivos] = await Promise.all([
        prisma.espacioAcogida.count({ where: { estado: 'activo' } }),
        prisma.centroEmergencia.count({ where: { activo: true } }),
        prisma.contactoDirectorio.count({ where: { activo: true } }),
        prisma.casoViogen.count({ where: { estado: 'activo' } })
      ])
      const plazasTotal = await prisma.espacioAcogida.aggregate({
        _sum: { plazasUrgencia: true }, where: { estado: 'activo' }
      })
      return NextResponse.json({ espacios, centros, contactos, casosActivos, plazasUrgencia: plazasTotal._sum.plazasUrgencia || 0 })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error GET /api/accion-social:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { tipo } = body
    if (tipo === 'espacio') {
      const espacio = await prisma.espacioAcogida.create({
        data: {
          nombre: body.nombre, tipo: body.tipoEspacio, direccion: body.direccion,
          telefono: body.telefono || null, email: body.email || null, contacto: body.contacto || null,
          plazas: body.plazas ? parseInt(body.plazas) : null,
          plazasUrgencia: body.plazasUrgencia ? parseInt(body.plazasUrgencia) : null,
          latitud: body.latitud ? parseFloat(body.latitud) : null,
          longitud: body.longitud ? parseFloat(body.longitud) : null,
          notas: body.notas || null
        }
      })
      return NextResponse.json({ espacio })
    }
    if (tipo === 'centro') {
      const centro = await prisma.centroEmergencia.create({
        data: {
          nombre: body.nombre, tipo: body.tipoCentro, direccion: body.direccion,
          telefono: body.telefono || null, responsable: body.responsable || null,
          capacidad: body.capacidad ? parseInt(body.capacidad) : null,
          latitud: body.latitud ? parseFloat(body.latitud) : null,
          longitud: body.longitud ? parseFloat(body.longitud) : null,
          descripcion: body.descripcion || null
        }
      })
      return NextResponse.json({ centro })
    }
    if (tipo === 'contacto') {
      const contacto = await prisma.contactoDirectorio.create({
        data: {
          nombre: body.nombre, entidad: body.entidad || null, categoria: body.categoria,
          cargo: body.cargo || null, telefono: body.telefono,
          telefonoAlt: body.telefonoAlt || null, email: body.email || null,
          disponibilidad: body.disponibilidad || null, notas: body.notas || null
        }
      })
      return NextResponse.json({ contacto })
    }
    if (tipo === 'viogen') {
      const año = new Date().getFullYear()
      const totalCasos = await prisma.casoViogen.count()
      const numeroCaso = `VG-${año}-${String(totalCasos + 1).padStart(4, '0')}`
      const caso = await prisma.casoViogen.create({
        data: {
          numeroCaso, fechaIntervencion: new Date(body.fechaIntervencion),
          victimaNombre: body.victimaNombre, victimaDni: body.victimaDni || null,
          victimaTelefono: body.victimaTelefono || null, victimaDireccion: body.victimaDireccion,
          victimaEdad: body.victimaEdad ? parseInt(body.victimaEdad) : null,
          tieneHijos: body.tieneHijos || false,
          numeroHijos: body.numeroHijos ? parseInt(body.numeroHijos) : null,
          edadesHijos: body.edadesHijos || null, agresorNombre: body.agresorNombre || null,
          agresorDni: body.agresorDni || null, motivoIntervencion: body.motivoIntervencion,
          recursosActivados: body.recursosActivados || null, derivadoA: body.derivadoA || null,
          observaciones: body.observaciones || null,
          registradoPorId: (session.user as any)?.id || null
        }
      })
      return NextResponse.json({ caso })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error POST /api/accion-social:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { tipo, id } = body
    if (tipo === 'espacio') {
      const espacio = await prisma.espacioAcogida.update({
        where: { id },
        data: {
          nombre: body.nombre, tipo: body.tipoEspacio, direccion: body.direccion,
          telefono: body.telefono || null, email: body.email || null, contacto: body.contacto || null,
          plazas: body.plazas ? parseInt(body.plazas) : null,
          plazasUrgencia: body.plazasUrgencia ? parseInt(body.plazasUrgencia) : null,
          latitud: body.latitud ? parseFloat(body.latitud) : null,
          longitud: body.longitud ? parseFloat(body.longitud) : null,
          estado: body.estado || 'activo', notas: body.notas || null
        }
      })
      return NextResponse.json({ espacio })
    }
    if (tipo === 'viogen') {
      const caso = await prisma.casoViogen.update({
        where: { id },
        data: { estado: body.estado, observaciones: body.observaciones || null, derivadoA: body.derivadoA || null, recursosActivados: body.recursosActivados || null }
      })
      return NextResponse.json({ caso })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error PUT /api/accion-social:', error)
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
    if (tipo === 'espacio') {
      await prisma.espacioAcogida.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }
    if (tipo === 'contacto') {
      await prisma.contactoDirectorio.update({ where: { id }, data: { activo: false } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error DELETE /api/accion-social:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
