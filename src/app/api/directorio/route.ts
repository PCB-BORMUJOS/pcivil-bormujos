import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const busqueda = searchParams.get("busqueda") || ""
    const categoria = searchParams.get("categoria") || ""

    const where: any = { activo: true }
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { entidad: { contains: busqueda, mode: "insensitive" } },
        { telefono: { contains: busqueda } },
        { cargo: { contains: busqueda, mode: "insensitive" } },
      ]
    }
    if (categoria) where.categoria = categoria

    const contactos = await prisma.contactoDirectorio.findMany({
      where,
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    })

    return NextResponse.json({ contactos })
  } catch (error) {
    console.error("Error GET directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, entidad, categoria, cargo, telefono, telefonoAlt, email, disponibilidad, notas } = body

    if (!nombre || !telefono || !categoria) {
      return NextResponse.json({ error: "Nombre, teléfono y categoría son obligatorios" }, { status: 400 })
    }

    const contacto = await prisma.contactoDirectorio.create({
      data: { nombre, entidad: entidad || null, categoria, cargo: cargo || null, telefono, telefonoAlt: telefonoAlt || null, email: email || null, disponibilidad: disponibilidad || null, notas: notas || null }
    })

    return NextResponse.json({ contacto })
  } catch (error) {
    console.error("Error POST directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await prisma.contactoDirectorio.update({
      where: { id },
      data: { activo: false }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
