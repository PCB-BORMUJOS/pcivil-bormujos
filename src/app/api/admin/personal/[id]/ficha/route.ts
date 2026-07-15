import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ficha = await prisma.fichaVoluntario.findUnique({
      where: { usuarioId: params.id }
    })

    // Historial de prácticas del voluntario, como responsable o participante.
    const registrosPracticas = await prisma.registroPractica.findMany({
      where: {
        OR: [
          { responsableId: params.id },
          { participantes: { array_contains: params.id } },
        ],
      },
      include: {
        practica: { select: { numero: true, titulo: true, familia: true } },
        responsable: { select: { numeroVoluntario: true, nombre: true, apellidos: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 200,
    })

    const practicas = registrosPracticas.map(r => ({
      id: r.id,
      fecha: r.fecha,
      turno: r.turno,
      resultado: r.resultado,
      duracionReal: r.duracionReal,
      practica: r.practica,
      rol: r.responsableId === params.id ? 'responsable' : 'participante',
      responsable: r.responsable,
    }))

    return NextResponse.json({ ficha, practicas })
  } catch (error) {
    console.error('Error al obtener ficha:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  const rol = (session.user as any)?.rol?.toLowerCase() || ''
  if ((({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3, responsable_turno: 2, voluntario: 1, visor: 4 } as Record<string,number>)[rol] ?? 1) < 4) {
    return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), { status: 403 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Verificar si ya existe
    const existente = await prisma.fichaVoluntario.findUnique({
      where: { usuarioId: params.id }
    })

    const data = {
      indicativo2: body.indicativo2,
      fechaAlta: body.fechaAlta ? new Date(body.fechaAlta) : null,
      fechaBaja: body.fechaBaja ? new Date(body.fechaBaja) : null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      edad: body.edad,
      sexo: body.sexo,
      domicilio: body.domicilio,
      numero: body.numero,
      bloque: body.bloque,
      piso: body.piso,
      puerta: body.puerta,
      letra: body.letra,
      codigoPostal: body.codigoPostal,
      localidad: body.localidad,
      provincia: body.provincia,
      telefonoFijo: body.telefonoFijo,
      dniNie: body.dniNie,
      areaAsignada: body.areaAsignada,
      areaSecundaria: body.areaSecundaria || null,
      categoria: body.categoria,
      permisoConducir: body.permisoConducir,
      fechaExpedicion: body.fechaExpedicion ? new Date(body.fechaExpedicion) : null,
      fechaValidez: body.fechaValidez ? new Date(body.fechaValidez) : null,
      formacionProfesional: body.formacionProfesional,
      ocupacionActual: body.ocupacionActual,
      minusvaliaReconocida: body.minusvaliaReconocida,
      datosAlergias: body.datosAlergias,
      contactoEmergencia: body.contactoEmergencia,
      telefonoEmergencia: body.telefonoEmergencia,
      formacionPC: body.formacionPC || [],
      otrasTitulaciones: body.otrasTitulaciones,
      acuerdoIndividual: body.acuerdoIndividual || false,
      acuerdoAdjunto: body.acuerdoAdjunto,
      certificadoTitularidad: body.certificadoTitularidad || false,
      certificadoAdjunto: body.certificadoAdjunto,
      modelo145: body.modelo145 || false,
      modelo145Adjunto: body.modelo145Adjunto,
      kmDesplazamiento: body.kmDesplazamiento !== undefined ? parseFloat(body.kmDesplazamiento) || 0 : 0,
      enPracticas: body.enPracticas ?? undefined,
      turnosPracticasRealizados: body.enPracticas === true ? 0 : (body.turnosPracticasRealizados !== undefined ? parseInt(body.turnosPracticasRealizados) || 0 : undefined),
      fechaInicioPracticas: body.fechaInicioPracticas ? new Date(body.fechaInicioPracticas) : null
    }

    let ficha
    if (existente) {
      ficha = await prisma.fichaVoluntario.update({
        where: { usuarioId: params.id },
        data
      })
    } else {
      ficha = await prisma.fichaVoluntario.create({
        data: {
          ...data,
          usuarioId: params.id
        }
      })
    }

    const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
    await registrarAudit({ accion: 'UPDATE', entidad: 'FichaVoluntario', entidadId: ficha.id, descripcion: 'Ficha de voluntario actualizada', usuarioId, usuarioNombre, modulo: 'Administracion' })
    return NextResponse.json({ success: true, ficha })
  } catch (error) {
    console.error('Error al guardar ficha:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}