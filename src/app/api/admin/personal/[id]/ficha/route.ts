import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ficha = await prisma.fichaVoluntario.findUnique({
      where: { usuarioId: params.id }
    })

    return NextResponse.json({ ficha })
  } catch (error) {
    console.error('Error al obtener ficha:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      modelo145Adjunto: body.modelo145Adjunto
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

    return NextResponse.json({ success: true, ficha })
  } catch (error) {
    console.error('Error al guardar ficha:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}