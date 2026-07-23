import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { put, del } from '@vercel/blob'

// GET - Obtener vehículos, documentos o mantenimientos
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const vehiculoId = searchParams.get('vehiculoId')

    // GET Documentos de un vehículo
    if (tipo === 'documentos') {

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
    // GET Siniestros de un vehículo
    if (tipo === 'siniestros') {
      if (!vehiculoId) return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
      const siniestros = await prisma.siniestroVehiculo.findMany({
        where: { vehiculoId },
        include: { usuario: { select: { nombre: true, apellidos: true } } },
        orderBy: { fecha: 'desc' }
      })
      return NextResponse.json({ siniestros })
    }
    if (tipo === 'repostajes') {
      const vehiculoId = searchParams.get('vehiculoId')
      if (!vehiculoId) return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
      const repostajes = await prisma.repostajeVehiculo.findMany({
        where: { vehiculoId },
        orderBy: { fecha: 'desc' }
      })
      return NextResponse.json({ repostajes })
    }
    if (tipo === 'fluidos') {
      const vehiculoId = searchParams.get('vehiculoId')
      if (!vehiculoId) return NextResponse.json({ error: 'vehiculoId requerido' }, { status: 400 })
      const registros = await prisma.registroFluidoVehiculo.findMany({
        where: { vehiculoId },
        include: {
          usuario: {
            select: {
              nombre: true, apellidos: true, numeroVoluntario: true,
              fichaVoluntario: { select: { indicativo2: true } }
            }
          }
        },
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }]
      })
      return NextResponse.json({ registros })
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
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const _rolV = (session.user as any)?.rol ?? 'voluntario'
    const _nivV = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[_rolV] ?? 1
    if (_nivV < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    // POST Crear vehículo
    if (tipo === 'vehiculo') {
      const body = await request.json()
      const { matricula, indicativo, tipoVehiculo, marca, modelo, anio, color, estado, plazas, potencia, cilindrada, capacidadCombustible, capacidadCarga, observaciones } = body

      if (!matricula || !tipoVehiculo) {
        return NextResponse.json({ error: 'Matrícula y tipo son obligatorios' }, { status: 400 })
      }

      const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email! }, select: { servicioId: true } })
      if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

      const vehiculo = await prisma.vehiculo.create({
        data: {
          matricula: matricula.toUpperCase().trim(),
          indicativo: indicativo?.trim() || null,
          tipo: tipoVehiculo,
          marca: marca?.trim() || null,
          modelo: modelo?.trim() || null,
          anio: anio ? parseInt(String(anio)) : null,
          color: color?.trim() || null,
          estado: estado || 'disponible',
          plazas: plazas ? parseInt(String(plazas)) : null,
          potencia: potencia ? parseInt(String(potencia)) : null,
          cilindrada: cilindrada ? parseInt(String(cilindrada)) : null,
          capacidadCombustible: capacidadCombustible ? parseFloat(String(capacidadCombustible)) : null,
          capacidadCarga: capacidadCarga ? parseFloat(String(capacidadCarga)) : null,
          observaciones: observaciones?.trim() || null,
          servicioId: usuario.servicioId,
        }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'Vehículo', entidadId: vehiculo.id, descripcion: `Vehículo creado: ${vehiculo.indicativo || vehiculo.matricula}`, usuarioId, usuarioNombre, modulo: 'Vehículos' })

      return NextResponse.json({ vehiculo })
    }

    // POST Subir documento
    if (tipo === 'documento') {
      const formData = await request.formData()
      const vehiculoId = formData.get('vehiculoId') as string
      const tipoDoc = formData.get('tipoDoc') as string
      const file = formData.get('file') as File

      if (!vehiculoId || !tipoDoc || !file) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 })
      }

      const blob = await put(`vehiculos/${vehiculoId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: false
      })

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

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPLOAD',
        entidad: 'Vehículo',
        entidadId: vehiculoId,
        descripcion: `Subido documento (${tipoDoc}): ${file.name}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
        datosNuevos: { tipoDoc, nombreArchivo: file.name }
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

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'CREATE',
        entidad: 'Vehículo',
        entidadId: vehiculoId,
        descripcion: 'Mantenimiento registrado: ' + tipoMant + ' - ' + descripcion,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
      })
      return NextResponse.json({ mantenimiento })
    }
    // POST Crear siniestro (multipart: campos + parte opcional)
    if (tipo === 'siniestro') {
      const formData = await request.formData()
      const str = (k: string) => { const v = formData.get(k); return typeof v === 'string' && v.trim() !== '' ? v.trim() : null }
      const vehiculoId = str('vehiculoId')
      const fecha = str('fecha')
      const tipoSin = str('tipo')
      const descripcion = str('descripcion')

      if (!vehiculoId || !fecha || !tipoSin || !descripcion) {
        return NextResponse.json({ error: 'vehiculoId, fecha, tipo y descripción son obligatorios' }, { status: 400 })
      }

      let parteUrl: string | null = null
      let parteNombre: string | null = null
      let parteBlobKey: string | null = null
      const file = formData.get('parte') as File | null
      if (file && typeof file !== 'string' && file.size > 0) {
        const permitidos = ['application/pdf', 'image/jpeg', 'image/png']
        if (!permitidos.includes(file.type)) {
          return NextResponse.json({ error: 'El parte debe ser PDF, JPG o PNG' }, { status: 400 })
        }
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 })
        }
        const blob = await put(`vehiculos/${vehiculoId}/siniestros/${Date.now()}-${file.name}`, file, {
          access: 'public',
          addRandomSuffix: false
        })
        parteUrl = blob.url
        parteNombre = file.name
        parteBlobKey = blob.pathname
      }

      const siniestro = await prisma.siniestroVehiculo.create({
        data: {
          vehiculoId,
          fecha: new Date(fecha),
          hora: str('hora'),
          tipo: tipoSin,
          gravedad: str('gravedad') || 'leve',
          lugar: str('lugar'),
          descripcion,
          kilometraje: str('kilometraje') ? parseInt(str('kilometraje') as string) : null,
          conductor: str('conductor'),
          terceroImplicado: str('terceroImplicado'),
          matriculaTercero: str('matriculaTercero'),
          aseguradora: str('aseguradora'),
          numeroSiniestro: str('numeroSiniestro'),
          atestado: str('atestado'),
          heridos: formData.get('heridos') === 'true',
          costeReparacion: str('costeReparacion') ? parseFloat(str('costeReparacion') as string) : null,
          estado: str('estado') || 'abierto',
          observaciones: str('observaciones'),
          parteUrl,
          parteNombre,
          parteBlobKey,
          usuarioId: session.user.id
        },
        include: { usuario: { select: { nombre: true, apellidos: true } } }
      })

      const _auditSin = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'CREATE',
        entidad: 'Vehículo',
        entidadId: vehiculoId,
        descripcion: `Siniestro registrado (${tipoSin}, ${siniestro.gravedad}): ${descripcion}`,
        usuarioId: _auditSin.usuarioId,
        usuarioNombre: _auditSin.usuarioNombre,
        modulo: 'Vehículos',
        datosNuevos: { tipo: tipoSin, gravedad: siniestro.gravedad, fecha, parte: parteNombre }
      })

      return NextResponse.json({ siniestro })
    }
    if (tipo === 'repostaje') {
      const body = await request.clone().json()
      const { vehiculoId, fecha, litros, precioLitro, costeTotal, kilometraje, tipoCarburante, gasolinera, observaciones } = body
      if (!vehiculoId || !fecha || !litros) {
        return NextResponse.json({ error: 'vehiculoId, fecha y litros requeridos' }, { status: 400 })
      }
      const repostaje = await prisma.repostajeVehiculo.create({
        data: {
          vehiculoId,
          fecha: new Date(fecha),
          litros: parseFloat(litros),
          precioLitro: precioLitro ? parseFloat(precioLitro) : null,
          costeTotal: costeTotal ? parseFloat(costeTotal) : null,
          kilometraje: kilometraje ? parseInt(kilometraje) : null,
          tipoCarburante: tipoCarburante || null,
          gasolinera: gasolinera || null,
          observaciones: observaciones || null,
        }
      })
      const _auditRepo = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'Vehículo', entidadId: repostaje.vehiculoId, descripcion: `Repostaje registrado: ${repostaje.litros}L de ${repostaje.tipoCarburante || 'carburante'}${repostaje.costeTotal ? ' — ' + repostaje.costeTotal + '€' : ''}`, usuarioId: _auditRepo.usuarioId, usuarioNombre: _auditRepo.usuarioNombre, modulo: 'Vehículos' })
      return NextResponse.json({ repostaje })
    }
    if (tipo === 'fluido') {
      const body = await request.clone().json()
      const { vehiculoId, fecha, tipoFluido, accion, cantidad, unidad, kilometraje, observaciones } = body
      if (!vehiculoId || !fecha || !tipoFluido || !accion) {
        return NextResponse.json({ error: 'vehiculoId, fecha, tipoFluido y accion requeridos' }, { status: 400 })
      }
      const registro = await prisma.registroFluidoVehiculo.create({
        data: {
          vehiculoId,
          fecha: new Date(fecha),
          tipoFluido,
          accion,
          cantidad: cantidad ? parseFloat(cantidad) : null,
          unidad: unidad || null,
          kilometraje: kilometraje ? parseInt(kilometraje) : null,
          observaciones: observaciones || null,
          usuarioId: session.user.id,
        },
        include: {
          usuario: {
            select: {
              nombre: true, apellidos: true, numeroVoluntario: true,
              fichaVoluntario: { select: { indicativo2: true } }
            }
          }
        }
      })
      const _auditFlu = getUsuarioAudit(session)
      await registrarAudit({ accion: 'CREATE', entidad: 'Vehículo', entidadId: registro.vehiculoId, descripcion: `Registro de fluido: ${registro.tipoFluido} — ${registro.accion}${registro.cantidad ? ' ' + registro.cantidad + ' ' + (registro.unidad || '') : ''}${registro.kilometraje ? ' — ' + registro.kilometraje.toLocaleString('es-ES') + ' km' : ''}`, usuarioId: _auditFlu.usuarioId, usuarioNombre: _auditFlu.usuarioNombre, modulo: 'Vehículos' })
      return NextResponse.json({ registro })
    }

    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error creating data:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}

// PUT - Actualizar vehículo o mantenimiento
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const _rolV = (session.user as any)?.rol ?? 'voluntario'
    const _nivV = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[_rolV] ?? 1
    if (_nivV < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    // PUT Actualizar vehículo
    if (tipo === 'vehiculo') {
      const body = await request.json()
      const {
        id,
        estado,
        kilometraje,
        anio,
        color,
        numeroChasis,
        bastidor,
        potencia,
        cilindrada,
        plazas,
        capacidadCombustible,
        capacidadCarga,
        observaciones
      } = body

      if (!id) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      }

      const vehiculoAnterior = await prisma.vehiculo.findUnique({ where: { id } })

      const vehiculo = await prisma.vehiculo.update({
        where: { id },
        data: {
          estado: estado || undefined,
          kmActual: kilometraje ? parseInt(String(kilometraje)) : undefined,
          anio: anio ? parseInt(String(anio)) : undefined,
          color: color !== undefined ? (color || null) : undefined,
          numeroChasis: numeroChasis !== undefined ? (numeroChasis || null) : undefined,
          bastidor: bastidor !== undefined ? (bastidor || null) : undefined,
          potencia: potencia ? parseInt(String(potencia)) : undefined,
          cilindrada: cilindrada ? parseInt(String(cilindrada)) : undefined,
          plazas: plazas ? parseInt(String(plazas)) : undefined,
          capacidadCombustible: capacidadCombustible ? parseFloat(String(capacidadCombustible)) : undefined,
          capacidadCarga: capacidadCarga ? parseFloat(String(capacidadCarga)) : undefined,
          observaciones: observaciones !== undefined ? (observaciones || null) : undefined,
        }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Vehículo',
        entidadId: id,
        descripcion: `Estado/KM actualizado: ${vehiculo.indicativo}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
        datosAnteriores: { estado: vehiculoAnterior?.estado, kmActual: vehiculoAnterior?.kmActual },
        datosNuevos: { estado: vehiculo.estado, kmActual: vehiculo.kmActual }
      })

      return NextResponse.json({ vehiculo })
    }

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

      const mantenimientoAnterior = await prisma.mantenimientoVehiculo.findUnique({ where: { id } })

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

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Vehículo',
        entidadId: mantenimiento.vehiculoId,
        descripcion: `Mantenimiento actualizado: ${tipoMant} - ${descripcion}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
        datosAnteriores: mantenimientoAnterior,
        datosNuevos: mantenimiento
      })

      return NextResponse.json({ mantenimiento })
    }

    // PUT Registro de fluido
    if (tipo === 'fluido') {
      const body = await request.json()
      const { id, fecha, tipoFluido, accion, cantidad, unidad, kilometraje, observaciones } = body
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

      const anterior = await prisma.registroFluidoVehiculo.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

      const registro = await prisma.registroFluidoVehiculo.update({
        where: { id },
        data: {
          fecha: fecha ? new Date(fecha) : undefined,
          tipoFluido: tipoFluido || undefined,
          accion: accion || undefined,
          cantidad: cantidad !== undefined && cantidad !== null && cantidad !== '' ? parseFloat(cantidad) : null,
          unidad: unidad || null,
          kilometraje: kilometraje !== undefined && kilometraje !== null && kilometraje !== '' ? parseInt(kilometraje) : null,
          observaciones: observaciones || null,
        },
        include: {
          usuario: {
            select: {
              nombre: true, apellidos: true, numeroVoluntario: true,
              fichaVoluntario: { select: { indicativo2: true } }
            }
          }
        }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Vehículo',
        entidadId: registro.vehiculoId,
        descripcion: `Registro de fluido actualizado: ${registro.tipoFluido} — ${registro.accion}${registro.kilometraje ? ' — ' + registro.kilometraje.toLocaleString('es-ES') + ' km' : ''}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
        datosAnteriores: anterior,
        datosNuevos: registro
      })

      return NextResponse.json({ registro })
    }

    // PUT Siniestro (edición completa; acepta JSON o multipart con parte nuevo)
    if (tipo === 'siniestro') {
      const esMultipart = (request.headers.get('content-type') || '').includes('multipart/form-data')
      let body: Record<string, any>
      let fileParte: File | null = null
      if (esMultipart) {
        const formData = await request.formData()
        body = {}
        formData.forEach((value, key) => {
          if (typeof value === 'string') body[key] = value.trim() === '' ? null : value.trim()
        })
        body.heridos = formData.get('heridos') === 'true'
        const f = formData.get('parte')
        if (f && typeof f !== 'string' && (f as File).size > 0) fileParte = f as File
      } else {
        body = await request.json()
      }
      const {
        id, estado, aseguradora, numeroSiniestro, costeReparacion, observaciones,
        fecha, hora, tipo: tipoSin, gravedad, lugar, descripcion, kilometraje,
        conductor, terceroImplicado, matriculaTercero, atestado, heridos
      } = body
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

      const anterior = await prisma.siniestroVehiculo.findUnique({ where: { id } })
      if (!anterior) return NextResponse.json({ error: 'Siniestro no encontrado' }, { status: 404 })

      // Sustitución / adjunto del parte
      let parteUrl: string | undefined
      let parteNombre: string | undefined
      let parteBlobKey: string | undefined
      if (fileParte) {
        const permitidos = ['application/pdf', 'image/jpeg', 'image/png']
        if (!permitidos.includes(fileParte.type)) {
          return NextResponse.json({ error: 'El parte debe ser PDF, JPG o PNG' }, { status: 400 })
        }
        if (fileParte.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 })
        }
        const blob = await put(`vehiculos/${anterior.vehiculoId}/siniestros/${Date.now()}-${fileParte.name}`, fileParte, {
          access: 'public',
          addRandomSuffix: false
        })
        if (anterior.parteBlobKey) {
          try { await del(anterior.parteBlobKey) } catch (blobError) { console.error('Error eliminando parte anterior:', blobError) }
        }
        parteUrl = blob.url
        parteNombre = fileParte.name
        parteBlobKey = blob.pathname
      }

      const siniestro = await prisma.siniestroVehiculo.update({
        where: { id },
        data: {
          estado: estado || undefined,
          aseguradora: aseguradora ?? undefined,
          numeroSiniestro: numeroSiniestro ?? undefined,
          costeReparacion: costeReparacion !== undefined && costeReparacion !== null && costeReparacion !== '' ? parseFloat(costeReparacion) : undefined,
          observaciones: observaciones ?? undefined,
          fecha: fecha ? new Date(fecha) : undefined,
          hora: hora ?? undefined,
          tipo: tipoSin || undefined,
          gravedad: gravedad || undefined,
          lugar: lugar ?? undefined,
          descripcion: descripcion || undefined,
          kilometraje: kilometraje !== undefined ? (kilometraje !== null && kilometraje !== '' ? parseInt(kilometraje) : null) : undefined,
          conductor: conductor ?? undefined,
          terceroImplicado: terceroImplicado ?? undefined,
          matriculaTercero: matriculaTercero ?? undefined,
          atestado: atestado ?? undefined,
          heridos: typeof heridos === 'boolean' ? heridos : undefined,
          parteUrl, parteNombre, parteBlobKey,
        },
        include: { usuario: { select: { nombre: true, apellidos: true } } }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'UPDATE',
        entidad: 'Vehículo',
        entidadId: siniestro.vehiculoId,
        descripcion: `Siniestro actualizado (${siniestro.tipo}) — estado: ${anterior.estado} → ${siniestro.estado}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos',
        datosAnteriores: anterior,
        datosNuevos: siniestro
      })

      return NextResponse.json({ siniestro })
    }

    // PUT Repostaje
    if (tipo === 'repostaje') {
      const body = await request.json()
      const { id, fecha, litros, precioLitro, costeTotal, kilometraje, tipoCarburante, gasolinera } = body
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
      const repostaje = await prisma.repostajeVehiculo.update({
        where: { id },
        data: {
          fecha: fecha ? new Date(fecha) : undefined,
          litros: litros ? parseFloat(litros) : undefined,
          precioLitro: precioLitro ? parseFloat(precioLitro) : null,
          costeTotal: costeTotal ? parseFloat(costeTotal) : null,
          kilometraje: kilometraje ? parseInt(kilometraje) : null,
          tipoCarburante: tipoCarburante || null,
          gasolinera: gasolinera || null,
        }
      })
      const _auditRepoU = getUsuarioAudit(session)
      await registrarAudit({ accion: 'UPDATE', entidad: 'Vehículo', entidadId: repostaje.vehiculoId, descripcion: `Repostaje actualizado: ${repostaje.litros}L`, usuarioId: _auditRepoU.usuarioId, usuarioNombre: _auditRepoU.usuarioNombre, modulo: 'Vehículos' })
      return NextResponse.json({ repostaje })
    }
    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error updating data:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

// DELETE - Eliminar documento o mantenimiento
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const _rolV = (session.user as any)?.rol ?? 'voluntario'
    const _nivV = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[_rolV] ?? 1
    if (_nivV < 3) return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })

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

      try {
        await del(documento.blobKey)
      } catch (blobError) {
        console.error('Error eliminando de Blob:', blobError)
      }

      await prisma.documentoVehiculo.delete({
        where: { id }
      })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({
        accion: 'DELETE',
        entidad: 'Vehículo',
        entidadId: documento.vehiculoId,
        descripcion: `Documento eliminado: ${documento.nombre}`,
        usuarioId,
        usuarioNombre,
        modulo: 'Vehículos'
      })

      return NextResponse.json({ success: true })
    }

    // DELETE Mantenimiento
    if (tipo === 'mantenimiento') {
      const mantenimiento = await prisma.mantenimientoVehiculo.findUnique({ where: { id } })
      
      await prisma.mantenimientoVehiculo.delete({
        where: { id }
      })

      if (mantenimiento) {
        const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
        await registrarAudit({
          accion: 'DELETE',
          entidad: 'Vehículo',
          entidadId: mantenimiento.vehiculoId,
          descripcion: `Mantenimiento eliminado: ${mantenimiento.tipo}`,
          usuarioId,
          usuarioNombre,
          modulo: 'Vehículos'
        })
      }

      return NextResponse.json({ success: true })
    }

    // DELETE Siniestro
    if (tipo === 'siniestro') {
      const sin = await prisma.siniestroVehiculo.findUnique({ where: { id } })
      if (!sin) return NextResponse.json({ error: 'Siniestro no encontrado' }, { status: 404 })

      if (sin.parteBlobKey) {
        try { await del(sin.parteBlobKey) } catch (blobError) { console.error('Error eliminando parte de Blob:', blobError) }
      }

      await prisma.siniestroVehiculo.delete({ where: { id } })

      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'DELETE', entidad: 'Vehículo', entidadId: sin.vehiculoId, descripcion: `Siniestro eliminado: ${sin.tipo} del ${sin.fecha.toLocaleDateString('es-ES')}`, usuarioId, usuarioNombre, modulo: 'Vehículos', datosAnteriores: sin })
      return NextResponse.json({ success: true })
    }

    // DELETE Repostaje
    if (tipo === 'repostaje') {
      const rep = await prisma.repostajeVehiculo.findUnique({ where: { id } })
      await prisma.repostajeVehiculo.delete({ where: { id } })
      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'DELETE', entidad: 'Vehículo', entidadId: rep?.vehiculoId || id, descripcion: `Repostaje eliminado`, usuarioId, usuarioNombre, modulo: 'Vehículos' })
      return NextResponse.json({ success: true })
    }
    // DELETE Fluido
    if (tipo === 'fluido') {
      const flu = await prisma.registroFluidoVehiculo.findUnique({ where: { id } })
      await prisma.registroFluidoVehiculo.delete({ where: { id } })
      const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
      await registrarAudit({ accion: 'DELETE', entidad: 'Vehículo', entidadId: flu?.vehiculoId || id, descripcion: `Registro de fluido eliminado: ${flu?.tipoFluido || ''}`, usuarioId, usuarioNombre, modulo: 'Vehículos' })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error deleting data:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
