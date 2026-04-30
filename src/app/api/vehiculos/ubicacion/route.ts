import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehiculoId, latitud, longitud, velocidad, precision, token } = body

    if (token !== process.env.TRACKING_TOKEN) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!vehiculoId || latitud === undefined || longitud === undefined) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await prisma.ubicacionVehiculo.updateMany({
      where: { vehiculoId, activo: true },
      data: { activo: false },
    })

    const ubicacion = await prisma.ubicacionVehiculo.create({
      data: {
        id: `${vehiculoId}_${Date.now()}`,
        vehiculoId,
        latitud,
        longitud,
        velocidad: velocidad ?? null,
        precision: precision ?? null,
        activo: true,
      },
    })

    return NextResponse.json({ ok: true, id: ubicacion.id })
  } catch (error) {
    console.error("Error ubicacion POST:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const ubicaciones = await prisma.ubicacionVehiculo.findMany({
      where: { activo: true },
      include: {
        vehiculo: {
          select: { id: true, indicativo: true, tipo: true, modelo: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ ubicaciones })
  } catch (error) {
    console.error("Error ubicacion GET:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
