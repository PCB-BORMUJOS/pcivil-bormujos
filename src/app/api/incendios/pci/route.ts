import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'

const NIVEL: Record<string, number> = {
  superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4,
}
const nivelDe = (session: any) => NIVEL[(session?.user as any)?.rol ?? 'voluntario'] ?? 1

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const edificioId = searchParams.get('edificioId')

  try {
    // Ficha completa de un edificio: revisiones, hallazgos, presupuestos, acciones.
    if (tipo === 'edificio' && edificioId) {
      const [edificio, revisiones, presupuestos, acciones, facturas] = await Promise.all([
        prisma.edificio.findUnique({ where: { id: edificioId } }),
        prisma.revisionPCI.findMany({
          where: { edificioId },
          include: { hallazgos: { orderBy: { elemento: 'asc' } }, presupuestos: true },
          orderBy: { fecha: 'asc' },
        }),
        prisma.presupuestoPCI.findMany({ where: { edificioId }, orderBy: { fecha: 'desc' } }),
        prisma.accionCorrectivaPCI.findMany({
          where: { edificioId },
          include: { presupuesto: { select: { numero: true, total: true } } },
          orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.facturaPCI.findMany({ where: { edificioId }, orderBy: { fecha: 'desc' } }),
      ])
      return NextResponse.json({ edificio, revisiones, presupuestos, acciones, facturas })
    }

    // Listado de edificios del contrato con su semáforo.
    if (tipo === 'edificios') {
      const edificios = await prisma.edificio.findMany({
        where: { revisionesPci: { some: {} } },
        include: {
          revisionesPci: {
            include: { _count: { select: { hallazgos: true } } },
            orderBy: { fecha: 'desc' },
          },
          accionesPci: { select: { id: true, estado: true, prioridad: true, importe: true, recurrente: true, categoria: true } },
          _count: { select: { presupuestosPci: true } },
        },
        orderBy: { nombre: 'asc' },
      })

      const lista = edificios.map(e => {
        const ultima = e.revisionesPci[0]
        const abiertas = e.accionesPci.filter(a => !['EJECUTADO', 'VERIFICADO', 'FACTURADO'].includes(a.estado))
        const recurrentes = abiertas.filter(a => a.recurrente).length
        const altas = abiertas.filter(a => a.prioridad === 'alta').length
        const importeAbierto = abiertas.filter(a => a.categoria === 'PCI').reduce((s, a) => s + (a.importe || 0), 0)
        const semaforo = altas > 0 ? 'rojo' : abiertas.length > 0 ? 'ambar' : 'verde'
        return {
          id: e.id, nombre: e.nombre, alias: e.alias, codigoCliente: e.codigoCliente,
          ultimaRevision: ultima ? { campana: ultima.campana, fecha: ultima.fecha, tipo: ultima.tipo, resultado: ultima.resultado, defectos: ultima._count.hallazgos } : null,
          totalRevisiones: e.revisionesPci.length,
          accionesAbiertas: abiertas.length,
          recurrentes, altas, importeAbierto,
          semaforo,
        }
      })
      return NextResponse.json({ edificios: lista })
    }

    // Pipeline global de acciones correctivas.
    if (tipo === 'acciones') {
      const categoria = searchParams.get('categoria')
      const acciones = await prisma.accionCorrectivaPCI.findMany({
        where: { ...(categoria && categoria !== 'todas' ? { categoria } : {}) },
        include: {
          edificio: { select: { id: true, nombre: true, alias: true, codigoCliente: true } },
          presupuesto: { select: { numero: true, total: true, estado: true } },
          origenRevision: { select: { campana: true, fecha: true } },
        },
        orderBy: [{ prioridad: 'asc' }, { importe: 'desc' }],
      })
      return NextResponse.json({ acciones })
    }

    // Presupuestos y facturas del contrato.
    if (tipo === 'presupuestos') {
      const [presupuestos, facturas] = await Promise.all([
        prisma.presupuestoPCI.findMany({
          include: { edificio: { select: { nombre: true, alias: true, codigoCliente: true } } },
          orderBy: { fecha: 'desc' },
        }),
        prisma.facturaPCI.findMany({
          include: { edificio: { select: { nombre: true, alias: true } } },
          orderBy: { fecha: 'desc' },
        }),
      ])
      return NextResponse.json({ presupuestos, facturas })
    }

    // KPIs de cabecera.
    if (tipo === 'kpis') {
      const [acciones, presupuestos, revisiones, facturas] = await Promise.all([
        prisma.accionCorrectivaPCI.findMany({ select: { estado: true, prioridad: true, importe: true, recurrente: true, categoria: true, edificioId: true } }),
        prisma.presupuestoPCI.findMany({ select: { total: true, estado: true, categoria: true } }),
        prisma.revisionPCI.findMany({ select: { campana: true, fecha: true, resultado: true }, orderBy: { fecha: 'desc' } }),
        prisma.facturaPCI.findMany({ select: { conformada: true, importe: true } }),
      ])
      const abiertas = acciones.filter(a => !['EJECUTADO', 'VERIFICADO', 'FACTURADO'].includes(a.estado))
      const centralesKO = await prisma.hallazgoPCI.findMany({
        where: { elemento: 'Central de detección', estado: 'NO_FUNCIONA' },
        select: { revision: { select: { edificioId: true } } },
      })
      const edificiosCentralKO = new Set(centralesKO.map(h => h.revision.edificioId)).size

      return NextResponse.json({
        kpis: {
          importePendientePci: +abiertas.filter(a => a.categoria === 'PCI').reduce((s, a) => s + (a.importe || 0), 0).toFixed(2),
          importePendienteCctv: +abiertas.filter(a => a.categoria === 'CCTV').reduce((s, a) => s + (a.importe || 0), 0).toFixed(2),
          accionesAbiertas: abiertas.length,
          accionesRecurrentes: abiertas.filter(a => a.recurrente).length,
          prioridadAlta: abiertas.filter(a => a.prioridad === 'alta').length,
          edificiosCentralKO,
          edificiosConDefectos: new Set(abiertas.map(a => a.edificioId)).size,
          totalRevisiones: revisiones.length,
          ultimaCampana: revisiones[0]?.campana || null,
          totalPresupuestado: +presupuestos.reduce((s, p) => s + (p.total || 0), 0).toFixed(2),
          facturasPendientes: facturas.filter(f => !f.conformada).length,
        },
      })
    }

    // Defectos recurrentes agrupados por elemento.
    if (tipo === 'recurrentes') {
      const hallazgos = await prisma.hallazgoPCI.findMany({
        include: { revision: { select: { campana: true, fecha: true, edificioId: true, edificio: { select: { nombre: true, alias: true, codigoCliente: true } } } } },
        orderBy: { createdAt: 'asc' },
      })
      const mapa: Record<string, any> = {}
      hallazgos.forEach(h => {
        const clave = `${h.revision.edificioId}|${h.descripcion}`
        if (!mapa[clave]) {
          mapa[clave] = {
            edificio: h.revision.edificio, elemento: h.elemento, estado: h.estado,
            descripcion: h.descripcion, campanas: [], veces: 0,
          }
        }
        mapa[clave].campanas.push(h.revision.campana)
        mapa[clave].veces++
      })
      const recurrentes = Object.values(mapa).filter((r: any) => r.veces >= 2).sort((a: any, b: any) => b.veces - a.veces)
      return NextResponse.json({ recurrentes })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en GET PCI:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (nivelDe(session) < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

  try {
    const body = await request.json()

    if (tipo === 'revision') {
      const { edificioId, campana, fecha, tipo: tipoRev, tecnico, equiposResumen, observaciones, numeroTrabajo, documento, hallazgos } = body
      if (!edificioId || !campana || !fecha) return NextResponse.json({ error: 'Edificio, campaña y fecha son obligatorios' }, { status: 400 })

      const lista: any[] = Array.isArray(hallazgos) ? hallazgos.filter((h: any) => h?.descripcion) : []
      const revision = await prisma.revisionPCI.create({
        data: {
          edificioId, campana, fecha: new Date(fecha),
          tipo: tipoRev || 'TRIMESTRAL',
          resultado: lista.length ? 'con_defectos' : 'favorable',
          tecnico: tecnico || null, equiposResumen: equiposResumen || null,
          observaciones: observaciones || null, numeroTrabajo: numeroTrabajo || null, documento: documento || null,
          hallazgos: { create: lista.map((h: any) => ({
            elemento: h.elemento || 'Otros',
            ubicacion: h.ubicacion || null,
            estado: h.estado || 'DEFECTO',
            descripcion: h.descripcion,
            requiereIntervencion: h.requiereIntervencion !== false,
          })) },
        },
        include: { hallazgos: true },
      })
      await registrarAudit({ accion: 'CREATE', entidad: 'RevisionPCI', entidadId: revision.id, descripcion: `Revisión PCI ${campana} registrada (${lista.length} hallazgos)`, usuarioId, usuarioNombre, modulo: 'Incendios' })
      return NextResponse.json({ revision })
    }

    if (tipo === 'presupuesto') {
      const { numero, edificioId, revisionId, fecha, concepto, base, iva, total, categoria, estado, notas, campana } = body
      if (!numero || !edificioId || !fecha || !concepto || total === undefined) {
        return NextResponse.json({ error: 'Número, edificio, fecha, concepto e importe son obligatorios' }, { status: 400 })
      }
      const presupuesto = await prisma.presupuestoPCI.create({
        data: {
          numero, edificioId, revisionId: revisionId || null, fecha: new Date(fecha), campana: campana || null,
          concepto, base: base ? parseFloat(base) : null, iva: iva ? parseFloat(iva) : null,
          total: parseFloat(total), categoria: categoria || 'PCI', estado: estado || 'PRESENTADO', notas: notas || null,
        },
      })
      await registrarAudit({ accion: 'CREATE', entidad: 'PresupuestoPCI', entidadId: presupuesto.id, descripcion: `Presupuesto PCI ${numero} — ${presupuesto.total} €`, usuarioId, usuarioNombre, modulo: 'Incendios' })
      return NextResponse.json({ presupuesto })
    }

    if (tipo === 'accion') {
      const { edificioId, descripcion, detalle, prioridad, categoria, importe, presupuestoId, origenRevisionId, responsable, notas } = body
      if (!edificioId || !descripcion) return NextResponse.json({ error: 'Edificio y descripción son obligatorios' }, { status: 400 })
      const accion = await prisma.accionCorrectivaPCI.create({
        data: {
          edificioId, descripcion, detalle: detalle || null,
          prioridad: prioridad || 'media', categoria: categoria || 'PCI',
          importe: importe ? parseFloat(importe) : null,
          presupuestoId: presupuestoId || null, origenRevisionId: origenRevisionId || null,
          estado: presupuestoId ? 'PRESUPUESTADO' : 'DETECTADO',
          responsable: responsable || null, notas: notas || null,
          primeraDeteccion: new Date(),
        },
      })
      await registrarAudit({ accion: 'CREATE', entidad: 'AccionCorrectivaPCI', entidadId: accion.id, descripcion: `Acción correctiva PCI: ${descripcion}`, usuarioId, usuarioNombre, modulo: 'Incendios' })
      return NextResponse.json({ accion })
    }

    if (tipo === 'factura') {
      const { numero, edificioId, fecha, concepto, importe, conformada, notas } = body
      if (!numero || !fecha || !concepto) return NextResponse.json({ error: 'Número, fecha y concepto son obligatorios' }, { status: 400 })
      const factura = await prisma.facturaPCI.create({
        data: {
          numero, edificioId: edificioId || null, fecha: new Date(fecha), concepto,
          importe: importe ? parseFloat(importe) : null, conformada: !!conformada, notas: notas || null,
        },
      })
      await registrarAudit({ accion: 'CREATE', entidad: 'FacturaPCI', entidadId: factura.id, descripcion: `Factura PCI ${numero}`, usuarioId, usuarioNombre, modulo: 'Incendios' })
      return NextResponse.json({ factura })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en POST PCI:', error)
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Ya existe un registro con ese número' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear el registro' }, { status: 500 })
  }
}

// ── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (nivelDe(session) < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (tipo === 'accion') {
      const anterior = await prisma.accionCorrectivaPCI.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 })

      const { estado, prioridad, importe, responsable, notas, descripcion, detalle, presupuestoId } = body
      const ahora = new Date()
      const accion = await prisma.accionCorrectivaPCI.update({
        where: { id },
        data: {
          estado: estado || undefined,
          prioridad: prioridad || undefined,
          descripcion: descripcion || undefined,
          detalle: detalle ?? undefined,
          importe: importe !== undefined && importe !== null && importe !== '' ? parseFloat(importe) : undefined,
          responsable: responsable ?? undefined,
          notas: notas ?? undefined,
          presupuestoId: presupuestoId ?? undefined,
          fechaAprobacion: estado === 'APROBADO' && !anterior.fechaAprobacion ? ahora : undefined,
          fechaEjecucion: estado === 'EJECUTADO' && !anterior.fechaEjecucion ? ahora : undefined,
          fechaVerificacion: estado === 'VERIFICADO' && !anterior.fechaVerificacion ? ahora : undefined,
        },
        include: { edificio: { select: { nombre: true } } },
      })
      await registrarAudit({
        accion: 'UPDATE', entidad: 'AccionCorrectivaPCI', entidadId: id,
        descripcion: `Acción PCI "${accion.descripcion}" (${accion.edificio.nombre}): ${anterior.estado} → ${accion.estado}`,
        usuarioId, usuarioNombre, modulo: 'Incendios', datosAnteriores: anterior, datosNuevos: accion,
      })
      return NextResponse.json({ accion })
    }

    if (tipo === 'presupuesto') {
      const anterior = await prisma.presupuestoPCI.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
      const { estado, total, concepto, notas, categoria } = body
      const presupuesto = await prisma.presupuestoPCI.update({
        where: { id },
        data: {
          estado: estado || undefined,
          concepto: concepto || undefined,
          categoria: categoria || undefined,
          total: total !== undefined && total !== null && total !== '' ? parseFloat(total) : undefined,
          notas: notas ?? undefined,
        },
      })
      await registrarAudit({ accion: 'UPDATE', entidad: 'PresupuestoPCI', entidadId: id, descripcion: `Presupuesto ${presupuesto.numero}: ${anterior.estado} → ${presupuesto.estado}`, usuarioId, usuarioNombre, modulo: 'Incendios', datosAnteriores: anterior, datosNuevos: presupuesto })
      return NextResponse.json({ presupuesto })
    }

    if (tipo === 'factura') {
      const { conformada, importe, notas } = body
      const factura = await prisma.facturaPCI.update({
        where: { id },
        data: {
          conformada: typeof conformada === 'boolean' ? conformada : undefined,
          importe: importe !== undefined && importe !== null && importe !== '' ? parseFloat(importe) : undefined,
          notas: notas ?? undefined,
        },
      })
      await registrarAudit({ accion: 'UPDATE', entidad: 'FacturaPCI', entidadId: id, descripcion: `Factura ${factura.numero}${factura.conformada ? ' conformada' : ''}`, usuarioId, usuarioNombre, modulo: 'Incendios' })
      return NextResponse.json({ factura })
    }

    if (tipo === 'revision') {
      const { observaciones, resultado, tecnico, equiposResumen } = body
      const revision = await prisma.revisionPCI.update({
        where: { id },
        data: {
          observaciones: observaciones ?? undefined,
          resultado: resultado || undefined,
          tecnico: tecnico ?? undefined,
          equiposResumen: equiposResumen ?? undefined,
        },
      })
      return NextResponse.json({ revision })
    }

    if (tipo === 'hallazgo') {
      const { estado, requiereIntervencion, descripcion } = body
      const hallazgo = await prisma.hallazgoPCI.update({
        where: { id },
        data: {
          estado: estado || undefined,
          requiereIntervencion: typeof requiereIntervencion === 'boolean' ? requiereIntervencion : undefined,
          descripcion: descripcion || undefined,
        },
      })
      return NextResponse.json({ hallazgo })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en PUT PCI:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (nivelDe(session) < 4) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const { usuarioId, usuarioNombre } = getUsuarioAudit(session)

  try {
    const modelos: Record<string, any> = {
      revision: prisma.revisionPCI,
      presupuesto: prisma.presupuestoPCI,
      accion: prisma.accionCorrectivaPCI,
      factura: prisma.facturaPCI,
      hallazgo: prisma.hallazgoPCI,
    }
    const modelo = modelos[tipo || '']
    if (!modelo) return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })

    await modelo.delete({ where: { id } })
    await registrarAudit({ accion: 'DELETE', entidad: `PCI:${tipo}`, entidadId: id, descripcion: `Registro PCI eliminado (${tipo})`, usuarioId, usuarioNombre, modulo: 'Incendios' })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE PCI:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
