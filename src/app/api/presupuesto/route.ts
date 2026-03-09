import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

function isAdmin(session: any) {
  return ['superadmin', 'admin'].includes(session?.user?.rol || '')
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const ejercicio = searchParams.get('ejercicio') ? parseInt(searchParams.get('ejercicio')!) : new Date().getFullYear()
  try {
    if (tipo === 'stats') {
      const [presupuestos, expedientes, proveedores, facturas] = await Promise.all([
        prisma.presupuestoAnual.findMany({ where: { ejercicio }, include: { partidas: true } }),
        prisma.expedienteCompra.findMany({ where: { ejercicio } }),
        prisma.proveedor.findMany({ where: { activo: true } }),
        prisma.facturaExpediente.findMany({ where: { expediente: { ejercicio } } })
      ])
      const totalAprobado = presupuestos.reduce((s, p) => s + Number(p.totalAprobado), 0)
      const totalComprometido = presupuestos.flatMap(p => p.partidas).reduce((s, pa) => s + Number(pa.importeComprometido), 0)
      const totalEjecutado = presupuestos.flatMap(p => p.partidas).reduce((s, pa) => s + Number(pa.importeEjecutado), 0)
      const totalFacturado = facturas.filter(f => f.estado !== 'anulada').reduce((s, f) => s + Number(f.importeTotal), 0)
      const expedientesAbiertos = expedientes.filter(e => !['cerrado', 'anulado'].includes(e.estado)).length
      const facturasPendientes = facturas.filter(f => f.estado === 'pendiente').length
      return NextResponse.json({ totalAprobado, totalComprometido, totalEjecutado, totalFacturado, disponible: totalAprobado - totalComprometido, porcentajeEjecucion: totalAprobado > 0 ? (totalEjecutado / totalAprobado * 100) : 0, expedientesAbiertos, facturasPendientes, totalProveedores: proveedores.length, totalExpedientes: expedientes.length })
    }
    if (tipo === 'presupuestos') {
      const data = await prisma.presupuestoAnual.findMany({ include: { partidas: { include: { _count: { select: { expedientes: true } } } } }, orderBy: { ejercicio: 'desc' } })
      return NextResponse.json({ presupuestos: data })
    }
    if (tipo === 'partidas') {
      const presupuestoId = searchParams.get('presupuestoId')
      const data = await prisma.partidaPresupuestaria.findMany({ where: presupuestoId ? { presupuestoId } : { presupuesto: { ejercicio } }, include: { presupuesto: { select: { ejercicio: true, denominacion: true } }, _count: { select: { expedientes: true } } }, orderBy: { codigo: 'asc' } })
      return NextResponse.json({ partidas: data })
    }
    if (tipo === 'expedientes') {
      const estado = searchParams.get('estado')
      const data = await prisma.expedienteCompra.findMany({ where: { ejercicio, ...(estado && estado !== 'all' ? { estado } : {}) }, include: { partida: { select: { codigo: true, denominacion: true } }, proveedor: { select: { nombre: true } }, _count: { select: { facturas: true, lineas: true, presupuestosProv: true } } }, orderBy: { createdAt: 'desc' } })
      return NextResponse.json({ expedientes: data })
    }
    if (tipo === 'expediente-detalle') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      const data = await prisma.expedienteCompra.findUnique({ where: { id }, include: { partida: true, proveedor: true, lineas: { orderBy: { createdAt: 'asc' } }, presupuestosProv: { include: { proveedor: true }, orderBy: { createdAt: 'desc' } }, facturas: { orderBy: { fechaFactura: 'desc' } }, historial: { orderBy: { createdAt: 'desc' } } } })
      if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      return NextResponse.json({ expediente: data })
    }
    if (tipo === 'proveedores') {
      const data = await prisma.proveedor.findMany({ include: { _count: { select: { expedientes: true, presupuestos: true } } }, orderBy: { nombre: 'asc' } })
      return NextResponse.json({ proveedores: data })
    }
    if (tipo === 'facturas') {
      const estado = searchParams.get('estado')
      const data = await prisma.facturaExpediente.findMany({ where: { expediente: { ejercicio }, ...(estado && estado !== 'all' ? { estado } : {}) }, include: { expediente: { select: { numero: true, titulo: true } } }, orderBy: { fechaFactura: 'desc' } })
      return NextResponse.json({ facturas: data })
    }
    if (tipo === 'ejercicios') {
      const data = await prisma.presupuestoAnual.findMany({ select: { ejercicio: true }, distinct: ['ejercicio'], orderBy: { ejercicio: 'desc' } })
      const ejExp = await prisma.expedienteCompra.findMany({ select: { ejercicio: true }, distinct: ['ejercicio'], orderBy: { ejercicio: 'desc' } })
      const todos = new Set([...data.map(d => d.ejercicio), ...ejExp.map(e => e.ejercicio)])
      return NextResponse.json({ ejercicios: Array.from(todos).sort((a, b) => b - a) })
    }
    return NextResponse.json({ error: 'Tipo no valido' }, { status: 400 })
  } catch (error) {
    console.error('Error GET presupuesto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const body = await request.json()
  const { tipo, ...data } = body
  try {
    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    if (tipo === 'presupuesto') {
      const result = await prisma.presupuestoAnual.create({ data: { ejercicio: parseInt(data.ejercicio), denominacion: data.denominacion, totalAprobado: parseFloat(data.totalAprobado), totalModificado: data.totalModificado ? parseFloat(data.totalModificado) : null, estado: data.estado || 'borrador', notas: data.notas || null } })
      await registrarAudit({ accion: 'CREATE', entidad: 'PresupuestoAnual', entidadId: result.id, descripcion: `Presupuesto ${result.ejercicio}: ${result.denominacion}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, presupuesto: result })
    }
    if (tipo === 'partida') {
      const result = await prisma.partidaPresupuestaria.create({ data: { presupuestoId: data.presupuestoId, codigo: data.codigo, denominacion: data.denominacion, capitulo: data.capitulo, importeAsignado: parseFloat(data.importeAsignado), importeModificado: data.importeModificado ? parseFloat(data.importeModificado) : null } })
      await registrarAudit({ accion: 'CREATE', entidad: 'PartidaPresupuestaria', entidadId: result.id, descripcion: `Partida ${result.codigo}: ${result.denominacion}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, partida: result })
    }
    if (tipo === 'proveedor') {
      const result = await prisma.proveedor.create({ data: { nombre: data.nombre, cif: data.cif || null, direccion: data.direccion || null, telefono: data.telefono || null, email: data.email || null, web: data.web || null, contacto: data.contacto || null, notas: data.notas || null } })
      await registrarAudit({ accion: 'CREATE', entidad: 'Proveedor', entidadId: result.id, descripcion: `Proveedor: ${result.nombre}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, proveedor: result })
    }
    if (tipo === 'expediente') {
      const ejercicio = parseInt(data.ejercicio) || new Date().getFullYear()
      const count = await prisma.expedienteCompra.count({ where: { ejercicio } })
      const numero = `EXP-${ejercicio}-${String(count + 1).padStart(4, '0')}`
      const result = await prisma.expedienteCompra.create({ data: { numero, ejercicio, titulo: data.titulo, descripcion: data.descripcion || null, tipo: data.tipo, estado: 'borrador', partidaId: data.partidaId || null, proveedorId: data.proveedorId || null, importeEstimado: data.importeEstimado ? parseFloat(data.importeEstimado) : null, fechaSolicitud: data.fechaSolicitud ? new Date(data.fechaSolicitud) : new Date(), objeto: data.objeto || null, criterios: data.criterios || null, notas: data.notas || null, solicitadoPor: usuarioNombre, tipoCompra: data.tipoCompra || null, retencionCredito: data.retencionCredito === true } })
      if (data.partidaId && data.importeEstimado) {
        const partida = await prisma.partidaPresupuestaria.findUnique({ where: { id: data.partidaId } })
        if (partida) await prisma.partidaPresupuestaria.update({ where: { id: data.partidaId }, data: { importeComprometido: Number(partida.importeComprometido) + parseFloat(data.importeEstimado) } })
      }
      await prisma.historialExpediente.create({ data: { expedienteId: result.id, estadoAnterior: null, estadoNuevo: 'borrador', comentario: 'Expediente creado', usuarioId, usuarioNombre } })
      await registrarAudit({ accion: 'CREATE', entidad: 'ExpedienteCompra', entidadId: result.id, descripcion: `Expediente ${numero}: ${result.titulo}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, expediente: result })
    }
    if (tipo === 'linea') {
      const result = await prisma.lineaExpediente.create({ data: { expedienteId: data.expedienteId, descripcion: data.descripcion, cantidad: parseFloat(data.cantidad), unidad: data.unidad, precioUnitario: data.precioUnitario ? parseFloat(data.precioUnitario) : null, importeTotal: data.importeTotal ? parseFloat(data.importeTotal) : null, iva: data.iva ? parseFloat(data.iva) : 21 } })
      return NextResponse.json({ success: true, linea: result })
    }
    if (tipo === 'presupuesto-proveedor') {
      const result = await prisma.presupuestoProveedor.create({ data: { expedienteId: data.expedienteId, proveedorId: data.proveedorId, importe: parseFloat(data.importe), iva: parseFloat(data.iva || 21), importeTotal: parseFloat(data.importeTotal), estado: data.estado || 'pendiente', fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : null, fechaValidez: data.fechaValidez ? new Date(data.fechaValidez) : null, documentoUrl: data.documentoUrl || null, notas: data.notas || null } })
      return NextResponse.json({ success: true, presupuesto: result })
    }
    if (tipo === 'factura') {
      const base = parseFloat(data.importeBase)
      const iva = parseFloat(data.iva || 21)
      const importeIva = base * iva / 100
      const importeTotal = base + importeIva
      const result = await prisma.facturaExpediente.create({ data: { expedienteId: data.expedienteId, numeroFactura: data.numeroFactura, proveedor: data.proveedor, fechaFactura: new Date(data.fechaFactura), fechaRecepcion: data.fechaRecepcion ? new Date(data.fechaRecepcion) : null, importeBase: base, iva, importeIva, importeTotal, estado: 'pendiente', documentoUrl: data.documentoUrl || null, notas: data.notas || null } })
      const exp = await prisma.expedienteCompra.findUnique({ where: { id: data.expedienteId } })
      if (exp) await prisma.expedienteCompra.update({ where: { id: data.expedienteId }, data: { importeFacturado: Number(exp.importeFacturado) + importeTotal } })
      await registrarAudit({ accion: 'CREATE', entidad: 'FacturaExpediente', entidadId: result.id, descripcion: `Factura ${result.numeroFactura} de ${result.proveedor}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, factura: result })
    }
    return NextResponse.json({ error: 'Tipo no valido' }, { status: 400 })
  } catch (error) {
    console.error('Error POST presupuesto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const body = await request.json()
  const { tipo, id, ...data } = body
  try {
    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    if (tipo === 'presupuesto') {
      const result = await prisma.presupuestoAnual.update({ where: { id }, data: { denominacion: data.denominacion, totalAprobado: parseFloat(data.totalAprobado), totalModificado: data.totalModificado ? parseFloat(data.totalModificado) : null, estado: data.estado, notas: data.notas || null } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'PresupuestoAnual', entidadId: id, descripcion: `Presupuesto ${result.ejercicio} actualizado`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, presupuesto: result })
    }
    if (tipo === 'partida') {
      const result = await prisma.partidaPresupuestaria.update({ where: { id }, data: { codigo: data.codigo, denominacion: data.denominacion, capitulo: data.capitulo, importeAsignado: parseFloat(data.importeAsignado), importeModificado: data.importeModificado ? parseFloat(data.importeModificado) : null } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'PartidaPresupuestaria', entidadId: id, descripcion: `Partida ${result.codigo} actualizada`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, partida: result })
    }
    if (tipo === 'proveedor') {
      const result = await prisma.proveedor.update({ where: { id }, data: { nombre: data.nombre, cif: data.cif || null, direccion: data.direccion || null, telefono: data.telefono || null, email: data.email || null, web: data.web || null, contacto: data.contacto || null, activo: data.activo !== undefined ? data.activo : true, notas: data.notas || null } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'Proveedor', entidadId: id, descripcion: `Proveedor actualizado: ${result.nombre}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, proveedor: result })
    }
    if (tipo === 'expediente-estado') {
      const expediente = await prisma.expedienteCompra.findUnique({ where: { id } })
      if (!expediente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      const result = await prisma.expedienteCompra.update({ where: { id }, data: { estado: data.estado, ...(data.importeAdjudicado ? { importeAdjudicado: parseFloat(data.importeAdjudicado) } : {}), ...(data.proveedorId ? { proveedorId: data.proveedorId } : {}), ...(data.fechaAdjudicacion ? { fechaAdjudicacion: new Date(data.fechaAdjudicacion) } : {}), notas: data.notas || expediente.notas, ...(data.retencionCredito !== undefined ? { retencionCredito: data.retencionCredito } : {}), ...(data.fechaRC ? { fechaRC: new Date(data.fechaRC) } : {}), ...(data.documentoRC ? { documentoRC: data.documentoRC } : {}) } })
      await prisma.historialExpediente.create({ data: { expedienteId: id, estadoAnterior: expediente.estado, estadoNuevo: data.estado, comentario: data.comentario || null, usuarioId, usuarioNombre } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'ExpedienteCompra', entidadId: id, descripcion: `Expediente ${expediente.numero} -> ${data.estado}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, expediente: result })
    }
    if (tipo === 'expediente') {
      const result = await prisma.expedienteCompra.update({ where: { id }, data: { titulo: data.titulo, descripcion: data.descripcion || null, tipo: data.tipo, partidaId: data.partidaId || null, proveedorId: data.proveedorId || null, importeEstimado: data.importeEstimado ? parseFloat(data.importeEstimado) : null, objeto: data.objeto || null, criterios: data.criterios || null, notas: data.notas || null, tipoCompra: data.tipoCompra || null, retencionCredito: data.retencionCredito !== undefined ? data.retencionCredito : undefined, fechaRC: data.fechaRC ? new Date(data.fechaRC) : undefined, documentoRC: data.documentoRC || undefined, informeTecnico: data.informeTecnico || undefined } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'ExpedienteCompra', entidadId: id, descripcion: `Expediente ${result.numero} actualizado`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, expediente: result })
    }
    if (tipo === 'factura-estado') {
      const result = await prisma.facturaExpediente.update({ where: { id }, data: { estado: data.estado, fechaPago: data.estado === 'pagada' ? new Date() : null, notas: data.notas || null } })
      await registrarAudit({ accion: 'UPDATE', entidad: 'FacturaExpediente', entidadId: id, descripcion: `Factura ${result.numeroFactura} -> ${result.estado}`, usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true, factura: result })
    }
    return NextResponse.json({ error: 'Tipo no valido' }, { status: 400 })
  } catch (error) {
    console.error('Error PUT presupuesto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  try {
    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    if (tipo === 'proveedor') {
      const check = await prisma.proveedor.findUnique({ where: { id }, include: { _count: { select: { expedientes: true } } } })
      if (check && check._count.expedientes > 0) return NextResponse.json({ error: 'No se puede eliminar: tiene expedientes asociados' }, { status: 400 })
      await prisma.proveedor.delete({ where: { id } })
      await registrarAudit({ accion: 'DELETE', entidad: 'Proveedor', entidadId: id, descripcion: 'Proveedor eliminado', usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true })
    }
    if (tipo === 'linea') {
      await prisma.lineaExpediente.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }
    if (tipo === 'presupuesto-proveedor') {
      await prisma.presupuestoProveedor.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }
    if (tipo === 'partida') {
      const check = await prisma.partidaPresupuestaria.findUnique({ where: { id }, include: { _count: { select: { expedientes: true } } } })
      if (check && check._count.expedientes > 0) return NextResponse.json({ error: 'No se puede eliminar: tiene expedientes asociados' }, { status: 400 })
      await prisma.partidaPresupuestaria.delete({ where: { id } })
      await registrarAudit({ accion: 'DELETE', entidad: 'PartidaPresupuestaria', entidadId: id, descripcion: 'Partida eliminada', usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true })
    }
    if (tipo === 'expediente') {
      const exp = await prisma.expedienteCompra.findUnique({ where: { id }, include: { _count: { select: { facturas: true } } } })
      if (exp && exp._count.facturas > 0) return NextResponse.json({ error: 'No se puede eliminar: tiene facturas asociadas' }, { status: 400 })
      await prisma.expedienteCompra.delete({ where: { id } })
      await registrarAudit({ accion: 'DELETE', entidad: 'ExpedienteCompra', entidadId: id, descripcion: 'Expediente eliminado', usuarioId, usuarioNombre, modulo: 'Presupuesto' })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Tipo no valido' }, { status: 400 })
  } catch (error) {
    console.error('Error DELETE presupuesto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
