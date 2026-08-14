import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { put, del } from '@vercel/blob'

// El área de compras es exclusiva de coordinación y jefatura del servicio.
const NIVEL: Record<string, number> = {
  superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 0,
}
async function autorizar(nivelMinimo = 4) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return { session: null, nivel: 0, error: 'No autorizado', status: 401 as const }
  const nivel = NIVEL[(session.user as any)?.rol ?? 'voluntario'] ?? 1
  if (nivel < nivelMinimo) return { session: null, nivel, error: 'Sin permisos suficientes', status: 403 as const }
  return { session, nivel, error: null, status: 200 as const }
}

const num = (v: any) => (v === undefined || v === null || v === '') ? null : parseFloat(String(v).replace(',', '.'))
const dec = (v: any) => v === null || v === undefined ? null : Number(v)

/** Umbrales de referencia para el número de ofertas exigibles. */
function ofertasExigidas(tipoCompra?: string | null): number {
  // Compra directa: 1 oferta. El resto de modalidades exigen 3 presupuestos.
  if (!tipoCompra || tipoCompra === 'directa_menor500') return 1
  return 3
}

async function siguienteNumero(ejercicio: number): Promise<string> {
  const ultimo = await prisma.expedienteCompra.findFirst({
    where: { ejercicio }, orderBy: { numero: 'desc' }, select: { numero: true },
  })
  const n = ultimo ? (parseInt(ultimo.numero.split('/')[0].replace(/\D/g, '')) || 0) + 1 : 1
  return `${String(n).padStart(4, '0')}/${ejercicio}`
}

async function anotarHistorial(expedienteId: string, anterior: string | null, nuevo: string, comentario: string, session: any) {
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
  await prisma.historialExpediente.create({
    data: { expedienteId, estadoAnterior: anterior, estadoNuevo: nuevo, comentario, usuarioId, usuarioNombre },
  }).catch(() => null)
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await autorizar()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  try {
    // Pipeline completo: peticiones con su expediente asociado.
    if (tipo === 'pipeline' || !tipo) {
      const ejercicio = parseInt(searchParams.get('ejercicio') || String(new Date().getFullYear()))
      const area = searchParams.get('area')

      const peticiones = await prisma.peticionMaterial.findMany({
        where: { ...(area && area !== 'todas' ? { areaOrigen: area } : {}) },
        include: {
          solicitante: { select: { id: true, nombre: true, apellidos: true } },
          aprobadoPor: { select: { nombre: true, apellidos: true } },
          items: true,
          expedienteCompra: {
            include: {
              presupuestosProv: { include: { proveedor: { select: { id: true, nombre: true, cif: true } } }, orderBy: { importeTotal: 'asc' } },
              facturas: true,
              partida: { select: { codigo: true, denominacion: true } },
              proveedor: { select: { id: true, nombre: true } },
              _count: { select: { lineas: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { fechaSolicitud: 'desc' },
        take: 400,
      })

      // Expedientes sin petición de origen (compras iniciadas directamente).
      const sueltos = await prisma.expedienteCompra.findMany({
        where: { peticionId: null, ejercicio },
        include: {
          presupuestosProv: { include: { proveedor: { select: { id: true, nombre: true, cif: true } } }, orderBy: { importeTotal: 'asc' } },
          facturas: true,
          partida: { select: { codigo: true, denominacion: true } },
          proveedor: { select: { id: true, nombre: true } },
          _count: { select: { lineas: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ peticiones, expedientesSueltos: sueltos })
    }

    // Ficha completa de un expediente.
    if (tipo === 'expediente') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      const expediente = await prisma.expedienteCompra.findUnique({
        where: { id },
        include: {
          peticion: { include: { solicitante: { select: { nombre: true, apellidos: true } }, items: true } },
          lineas: { orderBy: { createdAt: 'asc' } },
          presupuestosProv: { include: { proveedor: true }, orderBy: { importeTotal: 'asc' } },
          facturas: { orderBy: { fechaFactura: 'desc' } },
          historial: { orderBy: { createdAt: 'desc' } },
          partida: true,
          proveedor: true,
        },
      })
      return NextResponse.json({ expediente })
    }

    if (tipo === 'maestros') {
      const ejercicio = parseInt(searchParams.get('ejercicio') || String(new Date().getFullYear()))
      const [proveedores, partidas] = await Promise.all([
        prisma.proveedor.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
        prisma.partidaPresupuestaria.findMany({
          where: { presupuesto: { ejercicio } },
          orderBy: { codigo: 'asc' },
          include: { presupuesto: { select: { ejercicio: true } } },
        }).catch(() => []),
      ])
      return NextResponse.json({ proveedores, partidas })
    }

    // Indicadores de gestión del área.
    if (tipo === 'kpis') {
      const ejercicio = parseInt(searchParams.get('ejercicio') || String(new Date().getFullYear()))
      const [expedientes, peticiones] = await Promise.all([
        prisma.expedienteCompra.findMany({
          where: { ejercicio },
          include: { presupuestosProv: { select: { id: true } }, facturas: { select: { importeTotal: true, estado: true } } },
        }),
        prisma.peticionMaterial.findMany({ select: { estado: true, fechaSolicitud: true, fechaAprobacion: true, fechaRecepcion: true } }),
      ])

      const abiertos = expedientes.filter(e => !['cerrado', 'anulado'].includes(e.estado))
      const comprometido = expedientes.reduce((s, e) => s + (dec(e.importeAdjudicado) ?? dec(e.importeEstimado) ?? 0), 0)
      const facturado = expedientes.reduce((s, e) => s + (dec(e.importeFacturado) ?? 0), 0)

      // Incidencias de gestión que conviene resolver.
      const alertas = {
        sinInformeTecnico: abiertos.filter(e => !e.informeTecnico && !e.documentoInforme).length,
        sinPresupuestos: abiertos.filter(e => e.presupuestosProv.length === 0).length,
        ofertasInsuficientes: abiertos.filter(e => e.presupuestosProv.length > 0 && e.presupuestosProv.length < ofertasExigidas(e.tipoCompra)).length,
        sinRetencionCredito: abiertos.filter(e => !e.retencionCredito && !e.numeroRC).length,
        sinPartida: abiertos.filter(e => !e.partidaId).length,
        adjudicadosSinFactura: expedientes.filter(e => e.estado === 'adjudicado' && e.facturas.length === 0).length,
        facturasPendientesPago: expedientes.flatMap(e => e.facturas).filter(f => f.estado !== 'pagada').length,
      }

      // Plazos medios en días.
      const dias = (a?: Date | null, b?: Date | null) => (a && b) ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)) : null
      const plazosAprob = peticiones.map(p => dias(p.fechaSolicitud, p.fechaAprobacion)).filter((n): n is number => n !== null)
      const plazosEntrega = peticiones.map(p => dias(p.fechaAprobacion, p.fechaRecepcion)).filter((n): n is number => n !== null)
      const media = (a: number[]) => a.length ? +(a.reduce((s, n) => s + n, 0) / a.length).toFixed(1) : null

      return NextResponse.json({
        kpis: {
          expedientes: expedientes.length,
          abiertos: abiertos.length,
          comprometido: +comprometido.toFixed(2),
          facturado: +facturado.toFixed(2),
          pendienteFacturar: +(comprometido - facturado).toFixed(2),
          peticionesPendientes: peticiones.filter(p => p.estado === 'pendiente').length,
          plazoMedioAprobacion: media(plazosAprob),
          plazoMedioEntrega: media(plazosEntrega),
          alertas,
        },
      })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en GET compras:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await autorizar()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const session = auth.session
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  try {
    // Subida de documentos (RC, informe técnico, oferta, factura, albarán).
    if (tipo === 'documento') {
      const formData = await request.formData()
      const expedienteId = formData.get('expedienteId') as string
      const campo = formData.get('campo') as string
      const presupuestoId = formData.get('presupuestoId') as string | null
      const facturaId = formData.get('facturaId') as string | null
      const file = formData.get('file') as File

      if (!file || !campo) return NextResponse.json({ error: 'Archivo y campo requeridos' }, { status: 400 })
      const permitidos = ['application/pdf', 'image/jpeg', 'image/png']
      if (!permitidos.includes(file.type)) return NextResponse.json({ error: 'Solo se admiten PDF, JPG o PNG' }, { status: 400 })
      if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Archivo muy grande (máx 15MB)' }, { status: 400 })

      const blob = await put(`compras/${expedienteId || 'general'}/${campo}-${Date.now()}-${file.name}`, file, {
        access: 'public', addRandomSuffix: false,
      })

      if (presupuestoId) {
        await prisma.presupuestoProveedor.update({ where: { id: presupuestoId }, data: { documentoUrl: blob.url } })
      } else if (facturaId) {
        await prisma.facturaExpediente.update({ where: { id: facturaId }, data: { documentoUrl: blob.url } })
      } else if (expedienteId) {
        const campos: Record<string, string> = {
          documentoRC: 'documentoRC', documentoInforme: 'documentoInforme',
          documentoUrl: 'documentoUrl', documentoAlbaran: 'documentoAlbaran',
        }
        const destino = campos[campo]
        if (!destino) return NextResponse.json({ error: 'Campo no válido' }, { status: 400 })
        await prisma.expedienteCompra.update({ where: { id: expedienteId }, data: { [destino]: blob.url } })
      }

      await registrarAudit({ accion: 'UPLOAD', entidad: 'ExpedienteCompra', entidadId: expedienteId || '', descripcion: `Documento adjuntado (${campo}): ${file.name}`, usuarioId, usuarioNombre, modulo: 'Compras' })
      return NextResponse.json({ url: blob.url })
    }

    const body = await request.json()

    // Abrir el expediente (archivador) de una petición o uno independiente.
    if (tipo === 'expediente') {
      const { peticionId, titulo, descripcion, tipoCompra, importeEstimado, partidaId, ejercicio } = body
      const anio = parseInt(ejercicio) || new Date().getFullYear()

      let peticion: any = null
      if (peticionId) {
        peticion = await prisma.peticionMaterial.findUnique({ where: { id: peticionId }, include: { items: true, solicitante: true } })
        if (!peticion) return NextResponse.json({ error: 'Petición no encontrada' }, { status: 404 })
        const yaTiene = await prisma.expedienteCompra.findUnique({ where: { peticionId } })
        if (yaTiene) return NextResponse.json({ expediente: yaTiene, existente: true })
      }

      const numero = await siguienteNumero(anio)
      const expediente = await prisma.expedienteCompra.create({
        data: {
          numero, ejercicio: anio,
          titulo: titulo || peticion?.nombreArticulo || `Expediente ${numero}`,
          descripcion: descripcion || peticion?.descripcion || null,
          tipo: 'suministro',
          estado: 'propuesta',
          tipoCompra: tipoCompra || 'directa_menor500',
          importeEstimado: num(importeEstimado) ?? (peticion?.costeEstimado ? Number(peticion.costeEstimado) : null),
          partidaId: partidaId || null,
          fechaSolicitud: peticion?.fechaSolicitud || new Date(),
          solicitadoPor: peticion ? `${peticion.solicitante?.nombre || ''} ${peticion.solicitante?.apellidos || ''}`.trim() : usuarioNombre,
          peticionId: peticionId || null,
          objeto: peticion?.nombreArticulo || null,
          justificacion: peticion?.motivo || null,
          responsable: usuarioNombre,
          // Las líneas se heredan de los artículos pedidos.
          lineas: peticion?.items?.length ? {
            create: peticion.items.map((it: any) => ({
              descripcion: it.nombreArticulo,
              cantidad: it.cantidad,
              unidad: it.unidad || 'unidades',
              precioUnitario: it.costeUnitario ? Number(it.costeUnitario) : null,
              importeTotal: it.costeUnitario ? Number(it.costeUnitario) * it.cantidad : null,
            })),
          } : undefined,
        },
        include: { lineas: true },
      })

      await anotarHistorial(expediente.id, null, 'propuesta', 'Expediente abierto', session)
      await registrarAudit({ accion: 'CREATE', entidad: 'ExpedienteCompra', entidadId: expediente.id, descripcion: `Expediente ${numero} abierto: ${expediente.titulo}`, usuarioId, usuarioNombre, modulo: 'Compras' })
      return NextResponse.json({ expediente })
    }

    // Oferta de proveedor.
    if (tipo === 'presupuesto') {
      const { expedienteId, proveedorId, proveedorNombre, importe, iva, fechaEmision, fechaValidez, notas } = body
      if (!expedienteId) return NextResponse.json({ error: 'Expediente requerido' }, { status: 400 })

      let provId = proveedorId
      if (!provId && proveedorNombre) {
        const existente = await prisma.proveedor.findFirst({ where: { nombre: proveedorNombre } })
        provId = existente?.id || (await prisma.proveedor.create({ data: { nombre: proveedorNombre } })).id
      }
      if (!provId) return NextResponse.json({ error: 'Proveedor requerido' }, { status: 400 })

      const base = num(importe) ?? 0
      const tipoIva = num(iva) ?? 21
      const total = +(base * (1 + tipoIva / 100)).toFixed(2)

      const presupuesto = await prisma.presupuestoProveedor.create({
        data: {
          expedienteId, proveedorId: provId,
          importe: base, iva: tipoIva, importeTotal: total,
          estado: 'presentado',
          fechaEmision: fechaEmision ? new Date(fechaEmision) : new Date(),
          fechaValidez: fechaValidez ? new Date(fechaValidez) : null,
          notas: notas || null,
        },
        include: { proveedor: true },
      })
      await anotarHistorial(expedienteId, null, 'propuesta', `Oferta recibida de ${presupuesto.proveedor.nombre}: ${total} €`, session)
      return NextResponse.json({ presupuesto })
    }

    // Factura del expediente.
    if (tipo === 'factura') {
      const { expedienteId, numeroFactura, proveedor, fechaFactura, importeBase, iva, notas } = body
      if (!expedienteId || !numeroFactura) return NextResponse.json({ error: 'Expediente y número de factura requeridos' }, { status: 400 })

      const base = num(importeBase) ?? 0
      const tipoIva = num(iva) ?? 21
      const importeIva = +(base * tipoIva / 100).toFixed(2)
      const total = +(base + importeIva).toFixed(2)

      const factura = await prisma.facturaExpediente.create({
        data: {
          expedienteId, numeroFactura, proveedor: proveedor || null,
          fechaFactura: fechaFactura ? new Date(fechaFactura) : new Date(),
          fechaRecepcion: new Date(),
          importeBase: base, iva: tipoIva, importeIva, importeTotal: total,
          estado: 'recibida', notas: notas || null,
        },
      })

      const todas = await prisma.facturaExpediente.findMany({ where: { expedienteId }, select: { importeTotal: true } })
      await prisma.expedienteCompra.update({
        where: { id: expedienteId },
        data: { importeFacturado: todas.reduce((s, f) => s + (dec(f.importeTotal) ?? 0), 0) },
      })
      await anotarHistorial(expedienteId, null, 'facturado', `Factura ${numeroFactura} registrada: ${total} €`, session)
      return NextResponse.json({ factura })
    }

    // Línea de detalle.
    if (tipo === 'linea') {
      const { expedienteId, descripcion, cantidad, unidad, precioUnitario, iva } = body
      if (!expedienteId || !descripcion) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      const cant = num(cantidad) ?? 1
      const precio = num(precioUnitario)
      const linea = await prisma.lineaExpediente.create({
        data: {
          expedienteId, descripcion, cantidad: cant, unidad: unidad || 'unidades',
          precioUnitario: precio, importeTotal: precio !== null ? +(precio * cant).toFixed(2) : null,
          iva: num(iva) ?? 21,
        },
      })
      return NextResponse.json({ linea })
    }

    if (tipo === 'proveedor') {
      const { nombre, cif, telefono, email, direccion, contacto, notas } = body
      if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
      const proveedor = await prisma.proveedor.create({
        data: { nombre, cif: cif || null, telefono: telefono || null, email: email || null, direccion: direccion || null, contacto: contacto || null, notas: notas || null },
      })
      return NextResponse.json({ proveedor })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en POST compras:', error)
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Ya existe un registro con ese identificador' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear el registro', detalle: error?.message }, { status: 500 })
  }
}

// ── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const auth = await autorizar()
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const session = auth.session
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (tipo === 'expediente') {
      const anterior = await prisma.expedienteCompra.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })

      const campos = [
        'titulo', 'descripcion', 'objeto', 'justificacion', 'criterios', 'notas',
        'tipoCompra', 'informeTecnico', 'propuestaGasto', 'numeroRC', 'plazoEntrega', 'responsable', 'estado',
      ]
      const datos: any = {}
      campos.forEach(c => {
        if (body[c] === undefined) return
        // 'titulo' es obligatorio (NOT NULL): nunca se guarda vacío/null; si viene
        // vacío se conserva el valor anterior para no romper el guardado completo.
        if (c === 'titulo') {
          const t = typeof body.titulo === 'string' ? body.titulo.trim() : body.titulo
          if (t) datos.titulo = t
          return
        }
        datos[c] = body[c] || null
      })
      if (body.importeEstimado !== undefined) datos.importeEstimado = num(body.importeEstimado)
      if (body.importeAdjudicado !== undefined) datos.importeAdjudicado = num(body.importeAdjudicado)
      if (body.partidaId !== undefined) datos.partidaId = body.partidaId || null
      if (body.retencionCredito !== undefined) datos.retencionCredito = !!body.retencionCredito
      if (body.datos09A !== undefined) datos.datos09A = body.datos09A
      if (body.fechaRC !== undefined) datos.fechaRC = body.fechaRC ? new Date(body.fechaRC) : null
      if (body.fechaAlbaran !== undefined) datos.fechaAlbaran = body.fechaAlbaran ? new Date(body.fechaAlbaran) : null

      const expediente = await prisma.expedienteCompra.update({ where: { id }, data: datos })
      if (body.estado && body.estado !== anterior.estado) {
        await anotarHistorial(id, anterior.estado, body.estado, body.comentario || 'Cambio de estado', session)
      }
      await registrarAudit({ accion: 'UPDATE', entidad: 'ExpedienteCompra', entidadId: id, descripcion: `Expediente ${expediente.numero} actualizado`, usuarioId, usuarioNombre, modulo: 'Compras', datosAnteriores: anterior, datosNuevos: expediente })
      return NextResponse.json({ expediente })
    }

    // Edición de una línea de detalle (unidades, precio unidad, importe).
    if (tipo === 'linea') {
      const actual = await prisma.lineaExpediente.findUnique({ where: { id } })
      if (!actual) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

      const datos: any = {}
      if (body.descripcion !== undefined) datos.descripcion = String(body.descripcion || '').trim() || actual.descripcion
      if (body.unidad !== undefined) datos.unidad = String(body.unidad || '').trim() || 'unidades'
      if (body.cantidad !== undefined) datos.cantidad = num(body.cantidad) ?? 0
      if (body.precioUnitario !== undefined) datos.precioUnitario = num(body.precioUnitario)
      if (body.iva !== undefined) datos.iva = num(body.iva) ?? 21

      // Importe: si se envía explícito se respeta; si no, se recalcula con los
      // valores efectivos (cantidad × precio unidad).
      if (body.importeTotal !== undefined && body.importeTotal !== '' && body.importeTotal !== null) {
        datos.importeTotal = num(body.importeTotal)
      } else if (body.cantidad !== undefined || body.precioUnitario !== undefined) {
        const cant = datos.cantidad ?? dec(actual.cantidad) ?? 0
        const precio = datos.precioUnitario ?? dec(actual.precioUnitario)
        datos.importeTotal = (precio !== null && precio !== undefined) ? +(precio * cant).toFixed(2) : null
      }

      const linea = await prisma.lineaExpediente.update({ where: { id }, data: datos })
      return NextResponse.json({ linea })
    }

    // Adjudicación: se elige la oferta ganadora y se propaga al expediente.
    if (tipo === 'adjudicar') {
      const { presupuestoId } = body
      const presupuesto = await prisma.presupuestoProveedor.findUnique({ where: { id: presupuestoId }, include: { proveedor: true } })
      if (!presupuesto || presupuesto.expedienteId !== id) {
        return NextResponse.json({ error: 'Oferta no válida para este expediente' }, { status: 400 })
      }
      await prisma.presupuestoProveedor.updateMany({ where: { expedienteId: id }, data: { estado: 'descartado' } })
      await prisma.presupuestoProveedor.update({ where: { id: presupuestoId }, data: { estado: 'adjudicado' } })

      const anterior = await prisma.expedienteCompra.findUnique({ where: { id } })
      const expediente = await prisma.expedienteCompra.update({
        where: { id },
        data: {
          proveedorId: presupuesto.proveedorId,
          importeAdjudicado: presupuesto.importeTotal,
          estado: 'adjudicado',
          fechaAdjudicacion: new Date(),
        },
        include: { proveedor: true },
      })
      await anotarHistorial(id, anterior?.estado || null, 'adjudicado', `Adjudicado a ${presupuesto.proveedor.nombre} por ${dec(presupuesto.importeTotal)} €`, session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'ExpedienteCompra', entidadId: id, descripcion: `Expediente ${expediente.numero} adjudicado a ${presupuesto.proveedor.nombre} por ${dec(presupuesto.importeTotal)} €`, usuarioId, usuarioNombre, modulo: 'Compras' })
      return NextResponse.json({ expediente })
    }

    // Movimiento de la petición dentro del pipeline.
    if (tipo === 'peticion') {
      const { estado, comentario } = body
      const validos = ['pendiente', 'aprobada', 'en_compra', 'recibida', 'rechazada', 'cancelada']
      if (!validos.includes(estado)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })

      const anterior = await prisma.peticionMaterial.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Petición no encontrada' }, { status: 404 })

      const usuario = await prisma.usuario.findUnique({ where: { email: session.user!.email! }, select: { id: true } })
      const datos: any = { estado }
      if (estado === 'aprobada') { datos.fechaAprobacion = new Date(); datos.aprobadoPorId = usuario?.id || null; datos.notasAprobacion = comentario || null }
      if (estado === 'en_compra') { datos.fechaCompra = new Date(); datos.notasCompra = comentario || null }
      if (estado === 'recibida') { datos.fechaRecepcion = new Date(); datos.recibidoPorId = usuario?.id || null; datos.notasRecepcion = comentario || null }
      if (estado === 'rechazada') datos.motivoRechazo = comentario || null

      const peticion = await prisma.peticionMaterial.update({ where: { id }, data: datos })
      await prisma.historialPeticion.create({
        data: { peticionId: id, estadoAnterior: anterior.estado, estadoNuevo: estado, comentario: comentario || null, usuarioId: usuario?.id || '' },
      }).catch(() => null)

      await registrarAudit({ accion: 'UPDATE', entidad: 'Petición Material', entidadId: id, descripcion: `Petición ${peticion.numero}: ${anterior.estado} → ${estado}`, usuarioId, usuarioNombre, modulo: 'Compras' })
      return NextResponse.json({ peticion })
    }

    if (tipo === 'factura') {
      const { estado, fechaPago, notas } = body
      const factura = await prisma.facturaExpediente.update({
        where: { id },
        data: {
          estado: estado || undefined,
          fechaPago: fechaPago ? new Date(fechaPago) : (estado === 'pagada' ? new Date() : undefined),
          notas: notas ?? undefined,
        },
      })
      return NextResponse.json({ factura })
    }

    if (tipo === 'presupuesto') {
      const { importe, iva, notas, fechaValidez } = body
      const base = num(importe)
      const tipoIva = num(iva) ?? 21
      const presupuesto = await prisma.presupuestoProveedor.update({
        where: { id },
        data: {
          importe: base ?? undefined,
          iva: tipoIva,
          importeTotal: base !== null ? +(base * (1 + tipoIva / 100)).toFixed(2) : undefined,
          notas: notas ?? undefined,
          fechaValidez: fechaValidez ? new Date(fechaValidez) : undefined,
        },
      })
      return NextResponse.json({ presupuesto })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en PUT compras:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await autorizar(5)
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { usuarioId, usuarioNombre } = getUsuarioAudit(auth.session)

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  try {
    const modelos: Record<string, any> = {
      expediente: prisma.expedienteCompra,
      presupuesto: prisma.presupuestoProveedor,
      factura: prisma.facturaExpediente,
      linea: prisma.lineaExpediente,
    }
    const modelo = modelos[tipo || '']
    if (!modelo) return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
    await modelo.delete({ where: { id } })
    await registrarAudit({ accion: 'DELETE', entidad: `Compras:${tipo}`, entidadId: id, descripcion: `Registro de compras eliminado (${tipo})`, usuarioId, usuarioNombre, modulo: 'Compras' })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE compras:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
