import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import { put, del } from '@vercel/blob'

const prisma = new PrismaClient()

// GET - Obtener vehículos, documentos o mantenimientos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const vehiculoId = searchParams.get('vehiculoId')

    // GET Documentos de un vehículo
    if (tipo === 'documentos') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      if (!vehiculoId) {
        return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
      }

      const documentos = await prisma.documentoVehiculo.findMany({
        where: { vehiculoId },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        },
        orderBy: { fechaSubida: 'desc' }
      })

      return NextResponse.json({ documentos })
    }

    // GET Mantenimientos de un vehículo
    if (tipo === 'mantenimientos') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      if (!vehiculoId) {
        return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
      }

      const mantenimientos = await prisma.mantenimientoVehiculo.findMany({
        where: { vehiculoId },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        },
        orderBy: { fecha: 'desc' }
      })

      return NextResponse.json({ mantenimientos })
    }

    // GET Lista de vehículos (default)
    const vehiculos = await prisma.vehiculo.findMany({
      orderBy: { indicativo: 'asc' }
    })

    const stats = {
      total: vehiculos.length,
      disponibles: vehiculos.filter(v => v.estado === 'disponible').length,
      enServicio: vehiculos.filter(v => v.estado === 'en_servicio').length,
      mantenimiento: vehiculos.filter(v => v.estado === 'mantenimiento').length,
    }

    return NextResponse.json({ vehiculos, stats })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

// POST - Crear documento o mantenimiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    // POST Subir documento
    if (tipo === 'documento') {
      const formData = await request.formData()
      const vehiculoId = formData.get('vehiculoId') as string
      const tipoDoc = formData.get('tipoDoc') as string
      const file = formData.get('file') as File

      if (!vehiculoId || !tipoDoc || !file) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }

      // Validar que es PDF
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
      }

      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 })
      }

      // Subir a Vercel Blob
      const blob = await put(`vehiculos/${vehiculoId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: false
      })

      // Guardar en BD
      const documento = await prisma.documentoVehiculo.create({
        data: {
          vehiculoId,
          tipo: tipoDoc,
          nombre: file.name,
          url: blob.url,
          blobKey: blob.pathname,
          usuarioId: session.user.id
        },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        }
      })

      return NextResponse.json({ documento })
    }

    // POST Crear mantenimiento
    if (tipo === 'mantenimiento') {
      const body = await request.json()
      const {
        vehiculoId,
        fecha,
        tipo: tipoMant,
        descripcion,
        kilometraje,
        coste,
        proximaRevision,
        realizadoPor,
        observaciones
      } = body

      if (!vehiculoId || !fecha || !tipoMant || !descripcion) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }

      const mantenimiento = await prisma.mantenimientoVehiculo.create({
        data: {
          vehiculoId,
          fecha: new Date(fecha),
          tipo: tipoMant,
          descripcion,
          kilometraje: kilometraje ? parseInt(kilometraje) : null,
          coste: coste ? parseFloat(coste) : null,
          proximaRevision: proximaRevision ? new Date(proximaRevision) : null,
          realizadoPor,
          observaciones,
          usuarioId: session.user.id
        },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        }
      })

      return NextResponse.json({ mantenimiento })
    }

    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error creating data:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}

// PUT - Actualizar mantenimiento
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    // PUT Actualizar mantenimiento
    if (tipo === 'mantenimiento') {
      const body = await request.json()
      const {
        id,
        fecha,
        tipo: tipoMant,
        descripcion,
        kilometraje,
        coste,
        proximaRevision,
        realizadoPor,
        observaciones
      } = body

      if (!id) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      }

      const mantenimiento = await prisma.mantenimientoVehiculo.update({
        where: { id },
        data: {
          fecha: fecha ? new Date(fecha) : undefined,
          tipo: tipoMant,
          descripcion,
          kilometraje: kilometraje ? parseInt(kilometraje) : null,
          coste: coste ? parseFloat(coste) : null,
          proximaRevision: proximaRevision ? new Date(proximaRevision) : null,
          realizadoPor,
          observaciones
        },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true }
          }
        }
      })

      return NextResponse.json({ mantenimiento })
    }

    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error updating data:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

// DELETE - Eliminar documento o mantenimiento
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // DELETE Documento
    if (tipo === 'documento') {
      const documento = await prisma.documentoVehiculo.findUnique({
        where: { id }
      })

      if (!documento) {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      }

      // Eliminar de Vercel Blob
      try {
        await del(documento.blobKey)
      } catch (blobError) {
        console.error('Error eliminando de Blob:', blobError)
      }

      // Eliminar de BD
      await prisma.documentoVehiculo.delete({
        where: { id }
      })

      return NextResponse.json({ success: true })
    }

    // DELETE Mantenimiento
    if (tipo === 'mantenimiento') {
      await prisma.mantenimientoVehiculo.delete({
        where: { id }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error deleting data:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
