import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const AMBITOS_VALIDOS = ["accion_social", "cecopal"]

function nivel(session: any): number {
  const rol = (session?.user as any)?.rol ?? 'voluntario'
  return ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string, number>)[rol] ?? 1
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const busqueda = searchParams.get("busqueda") || ""
    const categoria = searchParams.get("categoria") || ""
    const ambito = searchParams.get("ambito") || ""
    const tipo = searchParams.get("tipo") || ""

    if (tipo === "categorias") {
      const categorias = await prisma.categoriaDirectorio.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
      })
      return NextResponse.json({ categorias })
    }

    // Proveedores (tabla propia, compartida con Presupuesto/compras)
    if (tipo === "proveedores") {
      const proveedores = await prisma.proveedor.findMany({
        where: {
          activo: true,
          ...(busqueda ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { contacto: { contains: busqueda, mode: "insensitive" } },
              { telefono: { contains: busqueda } },
              { cif: { contains: busqueda, mode: "insensitive" } },
            ]
          } : {}),
        },
        orderBy: { nombre: "asc" },
      })
      return NextResponse.json({ proveedores })
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
    // Filtro por ámbito: devuelve los contactos que incluyen ese ámbito
    // (los compartidos aparecen en todos los ámbitos que llevan).
    if (ambito && AMBITOS_VALIDOS.includes(ambito)) where.ambitos = { has: ambito }

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

// Normaliza ambitos: array de valores válidos; si viene vacío, cae a cecopal.
function parseAmbitos(body: any): string[] {
  let a: string[] = Array.isArray(body.ambitos) ? body.ambitos : (body.ambito ? [body.ambito] : [])
  a = a.filter((x) => AMBITOS_VALIDOS.includes(x))
  return a.length ? Array.from(new Set(a)) : ["cecopal"]
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (nivel(session) < 3) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await req.json()
    const { tipo } = body

    if (tipo === "categoria") {
      const { nombre, color } = body
      if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      const categoria = await prisma.categoriaDirectorio.create({ data: { nombre, color: color || "#6366f1" } })
      return NextResponse.json({ categoria })
    }

    if (tipo === "proveedor") {
      const { nombre, cif, direccion, telefono, email, web, contacto, notas } = body
      if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      const proveedor = await prisma.proveedor.create({
        data: { nombre, cif: cif || null, direccion: direccion || null, telefono: telefono || null, email: email || null, web: web || null, contacto: contacto || null, notas: notas || null }
      })
      return NextResponse.json({ proveedor })
    }

    const { nombre, entidad, categoria, cargo, telefono, telefonoAlt, email, extension3cx, disponibilidad, notas } = body
    if (!nombre || !telefono || !categoria) {
      return NextResponse.json({ error: "Nombre, teléfono y categoría son obligatorios" }, { status: 400 })
    }
    const ambitos = parseAmbitos(body)
    const contacto = await prisma.contactoDirectorio.create({
      data: {
        nombre, entidad: entidad || null, categoria, cargo: cargo || null, telefono,
        telefonoAlt: telefonoAlt || null, email: email || null, extension3cx: extension3cx || null,
        disponibilidad: disponibilidad || null, notas: notas || null,
        ambito: ambitos[0], ambitos,
      }
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
  if (nivel(session) < 3) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await req.json()
    const { tipo, id } = body

    if (tipo === "categoria") {
      const { nombre, color } = body
      const categoria = await prisma.categoriaDirectorio.update({ where: { id }, data: { nombre, color } })
      return NextResponse.json({ categoria })
    }

    if (tipo === "proveedor") {
      const { nombre, cif, direccion, telefono, email, web, contacto, notas } = body
      const proveedor = await prisma.proveedor.update({
        where: { id },
        data: { nombre, cif: cif || null, direccion: direccion || null, telefono: telefono || null, email: email || null, web: web || null, contacto: contacto || null, notas: notas || null }
      })
      return NextResponse.json({ proveedor })
    }

    const { nombre, entidad, categoria, cargo, telefono, telefonoAlt, email, extension3cx, disponibilidad, notas } = body
    const ambitos = parseAmbitos(body)
    const contacto = await prisma.contactoDirectorio.update({
      where: { id },
      data: {
        nombre, entidad: entidad || null, categoria, cargo: cargo || null, telefono,
        telefonoAlt: telefonoAlt || null, email: email || null, extension3cx: extension3cx || null,
        disponibilidad: disponibilidad || null, notas: notas || null,
        ambito: ambitos[0], ambitos,
      }
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
  if (nivel(session) < 3) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const tipo = searchParams.get("tipo") || ""
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    if (tipo === "categoria") {
      await prisma.categoriaDirectorio.update({ where: { id }, data: { activa: false } })
    } else if (tipo === "proveedor") {
      await prisma.proveedor.update({ where: { id }, data: { activo: false } })
    } else {
      await prisma.contactoDirectorio.update({ where: { id }, data: { activo: false } })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error DELETE directorio:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
