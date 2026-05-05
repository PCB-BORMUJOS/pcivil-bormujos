import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const busqueda = searchParams.get("busqueda") || ""
    const categoria = searchParams.get("categoria") || ""
    const tipo = searchParams.get("tipo") || ""

    if (tipo === "categorias") {
      const categorias = await prisma.categoriaDirectorio.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
      })
      return NextResponse.json({ categorias })
    }

    const where: Record<string, unknown> = { activo: true }
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { entidad: { contains: busqueda, mode: "insensitive" } },
        { telefono: { contains: busqueda } },
        { cargo: { contains: busqueda, mode: "insensitive" } },
        { extension3cx: { contains: busqueda } },
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { tipo } = body

    if (tipo === "categoria") {
      const { nombre, color } = body
      if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      const categoria = await prisma.categoriaDirectorio.create({
        data: { nombre, color: color || "#6366f1" }
      })
      return NextResponse.json({ categoria })
    }

    const { nombre, entidad, categoria, cargo, telefono, telefonoAlt, email, extension3cx, disponibilidad, notas } = body
    if (!nombre || !telefono || !categoria) {
      return NextResponse.json({ error: "Nombre, teléfono y categoría son obligatorios" }, { status: 400 })
    }
    const contacto = await prisma.contactoDirectorio.create({
      data: { nombre, entidad: entidad || null, categoria, cargo: cargo || null, telefono, telefonoAlt: telefonoAlt || null, email: email || null, extension3cx: extension3cx || null, disponibilidad: disponibilidad || null, notas: notas || null }
    })
    return NextResponse.json({ contacto })
  } catch (error) {
    console.error("Error POST directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { tipo, id } = body

    if (tipo === "categoria") {
      const { nombre, color } = body
      const categoria = await prisma.categoriaDirectorio.update({
        where: { id },
        data: { nombre, color }
      })
      return NextResponse.json({ categoria })
    }

    const { nombre, entidad, categoria, cargo, telefono, telefonoAlt, email, extension3cx, disponibilidad, notas } = body
    const contacto = await prisma.contactoDirectorio.update({
      where: { id },
      data: { nombre, entidad: entidad || null, categoria, cargo: cargo || null, telefono, telefonoAlt: telefonoAlt || null, email: email || null, extension3cx: extension3cx || null, disponibilidad: disponibilidad || null, notas: notas || null }
    })
    return NextResponse.json({ contacto })
  } catch (error) {
    console.error("Error PUT directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const tipo = searchParams.get("tipo") || ""
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    if (tipo === "categoria") {
      await prisma.categoriaDirectorio.update({ where: { id }, data: { activa: false } })
    } else {
      await prisma.contactoDirectorio.update({ where: { id }, data: { activo: false } })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
