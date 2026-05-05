import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

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

    let vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } })
    if (!vehiculo) {
      vehiculo = await prisma.vehiculo.findFirst({ where: { indicativo: vehiculoId.toUpperCase() } })
    }
    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    await prisma.ubicacionVehiculo.updateMany({
      where: { vehiculoId: vehiculo.id, activo: true },
      data: { activo: false },
    })

    const ubicacion = await prisma.ubicacionVehiculo.create({
      data: {
        id: `${vehiculo.id}_${Date.now()}`,
        vehiculoId: vehiculo.id,
        latitud, longitud,
        velocidad: velocidad ?? null,
        precision: precision ?? null,
        activo: true,
      },
    })

    return NextResponse.json({ ok: true, id: ubicacion.id, indicativo: vehiculo.indicativo })
  } catch (error) {
    console.error("Error ubicacion POST:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const vehiculoId = searchParams.get("vehiculoId")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    // Modo recorrido historico
    if (vehiculoId && desde && hasta) {
      const desdeDate = new Date(desde)
      const hastaDate = new Date(hasta)
      hastaDate.setHours(23, 59, 59, 999)

      const where: any = {
        createdAt: { gte: desdeDate, lte: hastaDate }
      }
      if (vehiculoId !== "all") where.vehiculoId = vehiculoId

      const puntos = await prisma.ubicacionVehiculo.findMany({
        where,
        include: { vehiculo: { select: { id: true, indicativo: true, modelo: true } } },
        orderBy: { createdAt: "asc" },
      })
      return NextResponse.json({ puntos })
    }

    // Modo tiempo real - solo activos
    const ubicaciones = await prisma.ubicacionVehiculo.findMany({
      where: { activo: true },
      include: { vehiculo: { select: { id: true, indicativo: true, tipo: true, modelo: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ ubicaciones })
  } catch (error) {
    console.error("Error ubicacion GET:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
