import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generarNumeroParte } from '@/lib/partesPSI'

const VEHICULOS_VALIDOS = ['UMJ', 'VIR', 'FSV', 'PMA']

function combinarTexto(datos: any): string {
  const intro = (datos.introduccion || '').trim()
  const desarrollo = (datos.desarrolloDetallado || '').trim()
  const conclusion = (datos.conclusion || '').trim()

  // Evitar duplicados: si intro o conclusión son iguales al desarrollo (o entre sí), omitirlos
  const introEfectivo = (intro && intro !== desarrollo) ? intro : ''
  const conclusionEfectiva = (conclusion && conclusion !== desarrollo && conclusion !== intro) ? conclusion : ''

  return [
    introEfectivo      ? `INTRODUCCIÓN:\n${introEfectivo}`        : '',
    desarrollo         ? `DESARROLLO:\n${desarrollo}`              : '',
    conclusionEfectiva ? `CONCLUSIÓN:\n${conclusionEfectiva}`     : '',
  ].filter(Boolean).join('\n\n')
}

function construirDatos(
  datos: any,
  fotosUrls: string[],
  firmas: { informante: string | null; responsable: string | null; jefe: string | null }
) {
  const tip = datos.tipologias || {}
  const tipologias: string[] = []
  for (const grupo of ['prevencion', 'intervencion', 'otros'] as const) {
    for (const [key, val] of Object.entries((tip[grupo] || {}) as Record<string, boolean>)) {
      if (val) tipologias.push(`${grupo}.${key}`)
    }
  }

  const vehiculos = (datos.vehiculos || []).filter((v: string) => VEHICULOS_VALIDOS.includes(v))
  const equipo: Array<{ indicativo: string; walkie: string }> = datos.equipo || []

  // equipoWalkies: lista plana de personal (vehículos van en vehiculosIds por separado)
  const equipoWalkies = equipo
    .map((e: { indicativo: string; walkie: string }) => ({
      equipo: e.indicativo || '',
      walkie: e.walkie || '',
    }))
    .filter((r: any) => r.equipo || r.walkie)

  const matriculasArr = (datos.matriculasImplicados || [])
    .concat(Array(5).fill('')).slice(0, 5) as string[]
  const matriculasStr = matriculasArr.filter(Boolean).join(', ') || null

  const circulacion = tipologias.some(t => t.startsWith('intervencion')) ? 'intervencion'
    : tipologias.some(t => t.startsWith('prevencion')) ? 'prevencion'
    : tipologias.some(t => t.startsWith('otros')) ? 'otros'
    : null

  const desarrolloDetallado = combinarTexto(datos)

  // tabla1: vehiculos en columna vehiculo (filas 0-3) + equipo en columna equipo (filas 0-5)
  // Son columnas independientes en el formulario — no se emparejan entre sí
  const tabla1 = Array.from({ length: 8 }, (_, i) => ({
    vehiculo: vehiculos[i] || '',
    equipo:   equipo[i]?.indicativo || '',
    walkie:   equipo[i]?.walkie     || '',
  }))

  // tabla2: equipo sobrante (posiciones 6 en adelante → segunda columna de equipo del formulario)
  const tabla2 = Array.from({ length: 8 }, (_, i) => ({
    equipo: equipo[i + 6]?.indicativo || '',
    walkie: equipo[i + 6]?.walkie     || '',
  }))

  // informacionExtra compatible con PsiFormState para restauración perfecta en el formulario
  const informacionExtra = {
    fecha: datos.fecha || '',
    hora: datos.hora || '',
    lugar: String(datos.lugar || '').trim(),
    motivo: String(datos.motivo || '').trim(),
    alertante: datos.alertante || '',
    circulacion: circulacion || '',
    tiempos: {
      llamada:    datos.horaLlamada    || '00:00',
      salida:     datos.horaSalida     || '00:00',
      llegada:    datos.horaLlegada    || '00:00',
      terminado:  datos.horaTerminado  || '00:00',
      disponible: datos.horaDisponible || '00:00',
    },
    tabla1,
    tabla2,
    prevencion:   tip.prevencion   || { mantenimiento: false, practicas: false, suministros: false, preventivo: false, otros: false },
    intervencion: tip.intervencion || { svb: false, incendios: false, inundaciones: false, otros_riesgos_meteo: false, activacion_pem_bor: false, otros: false },
    otros:        tip.otros        || { reunion_coordinacion: false, reunion_areas: false, limpieza: false, formacion: false, otros: false },
    otrosDescripcion: datos.otrosDescripcion || '',
    posiblesCausas:   datos.posiblesCausas || '',
    heridos:      datos.tieneHeridos === true ? 'si' : datos.tieneHeridos === false ? 'no' : '' as 'si' | 'no' | '',
    heridosNum:   String(datos.numeroHeridos || ''),
    fallecidos:   datos.tieneFallecidos === true ? 'si' : datos.tieneFallecidos === false ? 'no' : '' as 'si' | 'no' | '',
    fallecidosNum: String(datos.numeroFallecidos || ''),
    matriculasImplicados: matriculasArr,
    autoridadInterviene: '',
    policiaLocalDe:  datos.policiaLocal || '',
    guardiaCivilDe:  datos.guardiaCivil || '',
    descripcionAccidente: datos.descripcionAccidente || '',
    observaciones:    datos.observaciones || '',
    indicativosInforman:  datos.indicativoCumplimenta || '',
    indicativoCumplimenta: datos.indicativoCumplimenta || '',
    responsableTurno: datos.responsableTurno || '',
    vbJefeServicio:   'J-44',
    firmaInformante:  firmas.informante,
    firmaResponsable: firmas.responsable,
    firmaJefe:        firmas.jefe,
    desarrolloDetallado,
    fotos: [],
  }

  return {
    fecha: datos.fecha ? new Date(datos.fecha + 'T12:00:00+02:00') : new Date(),
    lugar: String(datos.lugar || '').trim(),
    motivo: datos.motivo ? String(datos.motivo).trim() : null,
    alertante: datos.alertante ? String(datos.alertante).trim() : null,
    circulacion,
    horaLlamada:    datos.horaLlamada    || null,
    horaSalida:     datos.horaSalida     || null,
    horaLlegada:    datos.horaLlegada    || null,
    horaTerminado:  datos.horaTerminado  || null,
    horaDisponible: datos.horaDisponible || null,
    vehiculosIds:   vehiculos,
    equipoWalkies,
    tipologias,
    tipologiasOtrosTexto: datos.otrosDescripcion ? { descripcion: datos.otrosDescripcion } : {},
    posiblesCausas:   datos.posiblesCausas   || null,
    tieneHeridos:    !!datos.tieneHeridos,
    numeroHeridos:   Number(datos.numeroHeridos) || 0,
    tieneFallecidos: !!datos.tieneFallecidos,
    numeroFallecidos: Number(datos.numeroFallecidos) || 0,
    matriculasImplicados: matriculasStr,
    policiaLocal:    datos.policiaLocal    || null,
    guardiaCivil:    datos.guardiaCivil    || null,
    descripcionAccidente: datos.descripcionAccidente || null,
    observaciones:   datos.observaciones   || '',
    desarrolloDetallado,
    indicativosInforman:   datos.indicativoCumplimenta || null,
    indicativoCumplimenta: datos.indicativoCumplimenta || null,
    responsableTurno:      datos.responsableTurno      || null,
    firmaIndicativoCumplimenta: firmas.informante  || null,
    firmaResponsableTurno:      firmas.responsable || null,
    firmaJefeServicio:          firmas.jefe        || null,
    fotosUrls,
    informacionExtra,
    estado: 'completo',
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any).rol as string
  if (!['superadmin', 'admin', 'coordinador'].includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const {
      datos,
      imagenes = [],
      firmas = { informante: null, responsable: null, jefe: null },
    }: {
      datos: any
      imagenes: string[]
      firmas: { informante: string | null; responsable: string | null; jefe: string | null }
    } = await request.json()

    if (!datos?.lugar || !datos?.fecha) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (fecha, lugar)' }, { status: 400 })
    }

    // Comprobar duplicado si el PDF trae numeroParte
    if (datos.numeroParte) {
      const existe = await prisma.partePSI.findUnique({ where: { numeroParte: datos.numeroParte } })
      if (existe) {
        return NextResponse.json({ ok: false, omitida: true, mensaje: `Ya existe el parte ${datos.numeroParte}` })
      }
    }

    let userId = session.user.id
    if (!userId && session.user.email) {
      const user = await prisma.usuario.findUnique({ where: { email: session.user.email } })
      if (user) userId = user.id
    }
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })

    const numeroParte = datos.numeroParte || await generarNumeroParte()
    const dbData = construirDatos(datos, imagenes, firmas)

    const parte = await prisma.partePSI.create({
      data: { ...dbData, numeroParte, creadoPorId: userId }
    })

    return NextResponse.json({ ok: true, parte })

  } catch (error: any) {
    console.error('[psi/importar/guardar]', error)
    return NextResponse.json({ error: error.message || 'Error guardando parte PSI' }, { status: 500 })
  }
}
