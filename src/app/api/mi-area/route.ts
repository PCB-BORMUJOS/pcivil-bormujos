import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        rol: { select: { nombre: true } },
        fichaVoluntario: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
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
      formaciones: [],
      actividades: [],
      documentos: []
    })
  } catch (error) {
    console.error('Error en GET /api/mi-area:', error)
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

    // Actualizar datos básicos del usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        telefono: body.telefono,
        dni: body.dni
      }
    })

    // Actualizar o crear ficha de voluntario
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