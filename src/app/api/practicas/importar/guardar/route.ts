import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const RIESGOS = ['bajo', 'medio', 'alto']
const NIVELES  = ['basico', 'intermedio', 'avanzado']

function sanitizar(datos: any, imagenes: string[]) {
  return {
    numero:              String(datos.numero  || '').trim(),
    titulo:              String(datos.titulo  || '').trim(),
    familia:             String(datos.familia || '').trim().toLowerCase(),
    subfamilia:          datos.subfamilia          ? String(datos.subfamilia).trim()          : null,
    objetivo:            String(datos.objetivo || '').trim(),
    descripcion:         datos.descripcion         ? String(datos.descripcion).trim()         : null,
    desarrollo:          datos.desarrollo           ? String(datos.desarrollo).trim()          : null,
    conclusiones:        datos.conclusiones         ? String(datos.conclusiones).trim()        : null,
    personalMinimo:      Number.isInteger(+datos.personalMinimo) && +datos.personalMinimo > 0 ? +datos.personalMinimo : 2,
    materialNecesario:   datos.materialNecesario    ? String(datos.materialNecesario).trim()   : null,
    riesgoPractica:      RIESGOS.includes(datos.riesgoPractica) ? datos.riesgoPractica : 'bajo',
    riesgoIntervencion:  datos.riesgoIntervencion   ? String(datos.riesgoIntervencion).trim()  : null,
    riesgoObservaciones: datos.riesgoObservaciones  ? String(datos.riesgoObservaciones).trim() : null,
    duracionEstimada:    Number.isInteger(+datos.duracionEstimada) && +datos.duracionEstimada > 0 ? +datos.duracionEstimada : 30,
    nivel:               NIVELES.includes(datos.nivel) ? datos.nivel : 'basico',
    prerequisitos:       datos.prerequisitos        ? String(datos.prerequisitos).trim()       : null,
    grupo:               datos.grupo                ? String(datos.grupo).trim()               : null,
    definicion:          datos.definicion           ? String(datos.definicion).trim()          : null,
    lugarDesarrollo:     datos.lugarDesarrollo      ? String(datos.lugarDesarrollo).trim()     : null,
    imagenes:            imagenes.length > 0        ? imagenes                                 : undefined,
    activa:              true,
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { datos, imagenes = [] }: { datos: any; imagenes: string[] } = await request.json()

    if (!datos?.numero || !datos?.titulo || !datos?.familia || !datos?.objetivo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (numero, titulo, familia, objetivo)' }, { status: 400 })
    }

    const existe = await prisma.practica.findUnique({ where: { numero: datos.numero } })
    if (existe) {
      return NextResponse.json({ ok: false, omitida: true, mensaje: `Ya existe la práctica ${datos.numero}` })
    }

    const practica = await prisma.practica.create({ data: sanitizar(datos, imagenes) })
    return NextResponse.json({ ok: true, practica })

  } catch (error: any) {
    console.error('[importar/guardar]', error)
    return NextResponse.json({ error: error.message || 'Error guardando práctica' }, { status: 500 })
  }
}
