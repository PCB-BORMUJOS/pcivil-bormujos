import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const mes = searchParams.get('mes')

    const usuario: any = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        rol: { select: { nombre: true } },
        fichaVoluntario: true,
        asignacionesVestuario: {
          where: { estado: { not: 'DADO_DE_BAJA' } },
          orderBy: { fechaAsignacion: 'desc' }
        },
        solicitudesVestuario: {
          orderBy: { fechaSolicitud: 'desc' }
        },

        inscripciones: {
          include: { convocatoria: { include: { curso: true } } },
          orderBy: { fechaInscripcion: 'desc' }
        },
        certificaciones: {
          include: { curso: true },
          orderBy: { fechaObtencion: 'desc' }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (tipo === 'vestuario') {
      return NextResponse.json({
        asignaciones: usuario.asignacionesVestuario,
        solicitudes: usuario.solicitudesVestuario
      })
    }

    // ... (dietas logic remains)

    // Construir objeto de respuesta
    const responseData = {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        telefono: usuario.telefono,
        dni: usuario.dni,
        numeroVoluntario: usuario.numeroVoluntario,
        activo: usuario.activo,
        rol: usuario.rol
      },
      ficha: usuario.fichaVoluntario ? {
        indicativo2: usuario.fichaVoluntario.indicativo2,
        fechaAlta: usuario.fichaVoluntario.fechaAlta,
        fechaBaja: usuario.fichaVoluntario.fechaBaja,
        fechaNacimiento: usuario.fichaVoluntario.fechaNacimiento,
        sexo: usuario.fichaVoluntario.sexo,
        domicilio: usuario.fichaVoluntario.domicilio,
        numero: usuario.fichaVoluntario.numero,
        piso: usuario.fichaVoluntario.piso,
        codigoPostal: usuario.fichaVoluntario.codigoPostal,
        localidad: usuario.fichaVoluntario.localidad,
        provincia: usuario.fichaVoluntario.provincia,
        telefonoEmergencia: usuario.fichaVoluntario.telefonoEmergencia,
        contactoEmergencia: usuario.fichaVoluntario.contactoEmergencia,
        areaAsignada: usuario.fichaVoluntario.areaAsignada,
        categoria: usuario.fichaVoluntario.categoria,
        permisoConducir: usuario.fichaVoluntario.permisoConducir,
        fechaExpedicionPermiso: usuario.fichaVoluntario.fechaExpedicion,
        fechaValidezPermiso: usuario.fichaVoluntario.fechaValidez,
        formacionProfesional: usuario.fichaVoluntario.formacionProfesional,
        ocupacionActual: usuario.fichaVoluntario.ocupacionActual,
        alergias: usuario.fichaVoluntario.datosAlergias,
        grupoSanguineo: usuario.fichaVoluntario.grupoSanguineo
      } : null,
      formaciones: [
        // Mapear inscripciones a formato Formacion
        ...(usuario.inscripciones || []).map((i: any) => ({
          id: i.id,
          nombre: i.convocatoria.curso.nombre,
          tipo: i.convocatoria.curso.tipo,
          fechaObtencion: i.fechaInscripcion.toISOString(),
          entidad: i.convocatoria.curso.entidadOrganiza || 'Protección Civil Bormujos',
          horas: i.convocatoria.curso.duracionHoras,
          estado: i.estado === 'admitida' ? 'vigente' : 'pendiente',
          documentoUrl: i.certificadoUrl
        })),
        // Mapear certificaciones a formato Formacion
        ...(usuario.certificaciones || []).map((c: any) => ({
          id: c.id,
          nombre: c.curso.nombre,
          tipo: 'Certificación Oficial',
          fechaObtencion: c.fechaObtencion.toISOString(),
          fechaValidez: c.fechaExpiracion?.toISOString(),
          entidad: c.entidadEmisora,
          horas: c.curso.duracionHoras,
          estado: c.vigente ? 'vigente' : 'vencido',
          documentoUrl: c.certificadoUrl,
          documentoNombre: `Certificado ${c.numeroCertificado}`
        }))
      ],
      actividades: [],
      documentos: [],
      vestuario: {
        asignaciones: usuario.asignacionesVestuario,
        solicitudes: usuario.solicitudesVestuario
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error en GET /api/mi-area:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo } = body

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (tipo === 'solicitud-vestuario') {
      const solicitud = await prisma.solicitudVestuario.create({
        data: {
          usuarioId: usuario.id,
          tipoPrenda: body.tipoPrenda,
          talla: body.talla,
          cantidad: body.cantidad || 1,
          motivo: body.motivo,
          descripcion: body.descripcion,
          asignacionAnteriorId: body.asignacionAnteriorId || null,
          estado: 'PENDIENTE'
        },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true, email: true }
          }
        }
      })

      await prisma.notificacion.create({
        data: {
          usuarioId: usuario.id,
          tipo: 'SOLICITUD_VESTUARIO',
          titulo: 'Nueva solicitud de vestuario',
          mensaje: `${usuario.nombre} ${usuario.apellidos} ha solicitado ${body.tipoPrenda} - ${body.talla}`,
          leida: false,
          enlace: '/logistica?tab=vestuario'
        }
      })

      return NextResponse.json({ success: true, solicitud })
    }

    if (tipo === 'cambiar-password') {
      const { passwordActual, passwordNuevo } = body

      if (!passwordActual || !passwordNuevo) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
      }

      if (passwordNuevo.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      }

      // Verificar contraseña actual
      const passwordValida = await bcrypt.compare(passwordActual, usuario.password)
      if (!passwordValida) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(passwordNuevo, 10)

      // Actualizar contraseña
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { password: hashedPassword }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 })
  } catch (error) {
    console.error('Error en POST /api/mi-area:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: { fichaVoluntario: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        telefono: body.telefono,
        dni: body.dni
      }
    })

    const fichaData = {
      indicativo2: body.indicativo2 || null,
      fechaAlta: body.fechaAlta ? new Date(body.fechaAlta) : null,
      fechaBaja: body.fechaBaja ? new Date(body.fechaBaja) : null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      sexo: body.sexo || null,
      domicilio: body.domicilio || null,
      numero: body.numero || null,
      piso: body.piso || null,
      codigoPostal: body.codigoPostal || null,
      localidad: body.localidad || 'BORMUJOS',
      provincia: body.provincia || 'SEVILLA',
      telefonoEmergencia: body.telefonoEmergencia || null,
      contactoEmergencia: body.contactoEmergencia || null,
      areaAsignada: body.areaAsignada || null,
      categoria: body.categoria || 'VOLUNTARIO',
      permisoConducir: body.permisoConducir || null,
      fechaExpedicion: body.fechaExpedicionPermiso ? new Date(body.fechaExpedicionPermiso) : null,
      fechaValidez: body.fechaValidezPermiso ? new Date(body.fechaValidezPermiso) : null,
      formacionProfesional: body.formacionProfesional || null,
      ocupacionActual: body.ocupacionActual || null,
      datosAlergias: body.alergias || null,
      grupoSanguineo: body.grupoSanguineo || null
    }

    if (usuario.fichaVoluntario) {
      await prisma.fichaVoluntario.update({
        where: { id: usuario.fichaVoluntario.id },
        data: fichaData
      })
    } else {
      await prisma.fichaVoluntario.create({
        data: {
          ...fichaData,
          usuarioId: usuario.id
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PUT /api/mi-area:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
