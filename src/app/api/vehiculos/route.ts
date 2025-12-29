import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
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
    console.error('Error fetching vehiculos:', error)
    return NextResponse.json({ error: 'Error al obtener vehículos' }, { status: 500 })
  }
}
