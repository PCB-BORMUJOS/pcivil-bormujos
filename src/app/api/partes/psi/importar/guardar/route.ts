import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generarNumeroParte } from '@/lib/partesPSI'

const VEHICULOS_VALIDOS = ['UMJ', 'VIR', 'FSV', 'PMA']

function construirDatos(datos: any, fotosUrls: string[]) {
  const tip = datos.tipologias || {}
  const tipologias: string[] = []
  for (const grupo of ['prevencion', 'intervencion', 'otros'] as const) {
    for (const [key, val] of Object.entries((tip[grupo] || {}) as Record<string, boolean>)) {
      if (val) tipologias.push(`${grupo}.${key}`)
    }
  }

  const vehiculos = (datos.vehiculos || []).filter((v: string) => VEHICULOS_VALIDOS.includes(v))
  const equipo: Array<{ indicativo: string; walkie: string }> = datos.equipo || []

  const equipoWalkies = [
    ...vehiculos.map((v: string, i: number) => ({
      vehiculo: v,
      equipo: equipo[i]?.indicativo || '',
      walkie: equipo[i]?.walkie || '',
    })),
    ...equipo.slice(vehiculos.length).map((e: { indicativo: string; walkie: string }) => ({
      equipo: e.indicativo || '',
      walkie: e.walkie || '',
    })),
  ].filter((r: any) => r.vehiculo || r.equipo || r.walkie)

  const matriculasArr = (datos.matriculasImplicados || [])
    .concat(Array(5).fill('')).slice(0, 5) as string[]
  const matriculasStr = matriculasArr.filter(Boolean).join(', ') || null

  const circulacion = tipologias.some(t => t.startsWith('intervencion')) ? 'intervencion'
    : tipologias.some(t => t.startsWith('prevencion')) ? 'prevencion'
    : tipologias.some(t => t.startsWith('otros')) ? 'otros'
    : null

  // informacionExtra: PsiFormState compatible para restauración perfecta en el formulario
  const tabla1 = vehiculos.map((v: string, i: number) => ({
    vehiculo: v,
    equipo: equipo[i]?.indicativo || '',
    walkie: equipo[i]?.walkie || '',
  })).concat(Array(8).fill({ vehiculo: '', equipo: '', walkie: '' })).slice(0, 8)

  const tabla2 = equipo.slice(vehiculos.length).map((e: { indicativo: string; walkie: string }) => ({
    equipo: e.indicativo || '',
    walkie: e.walkie || '',
  })).concat(Array(8).fill({ equipo: '', walkie: '' })).slice(0, 8)

  const informacionExtra = {
    fecha: datos.fecha || '',
    hora: datos.hora || '',
    lugar: String(datos.lugar || '').trim(),
    motivo: String(datos.motivo || '').trim(),
    alertante: datos.alertante || '',
    circulacion: circulacion || '',
    tiempos: {
      llamada: datos.horaLlamada || '00:00',
      salida: datos.horaSalida || '00:00',
      llegada: datos.horaLlegada || '00:00',
      terminado: datos.horaTerminado || '00:00',
      disponible: datos.horaDisponible || '00:00',
    },
    tabla1,
    tabla2,
    prevencion: tip.prevencion || { mantenimiento: false, practicas: false, suministros: false, preventivo: false, otros: false },
    intervencion: tip.intervencion || { svb: false, incendios: false, inundaciones: false, otros_riesgos_meteo: false, activacion_pem_bor: false, otros: false },
    otros: tip.otros || { reunion_coordinacion: false, reunion_areas: false, limpieza: false, formacion: false, otros: false },
    otrosDescripcion: datos.otrosDescripcion || '',
    posiblesCausas: datos.posiblesCausas || '',
    heridos: datos.tieneHeridos === true ? 'si' : datos.tieneHeridos === false ? 'no' : '' as 'si' | 'no' | '',
    heridosNum: String(datos.numeroHeridos || ''),
    fallecidos: datos.tieneFallecidos === true ? 'si' : datos.tieneFallecidos === false ? 'no' : '' as 'si' | 'no' | '',
    fallecidosNum: String(datos.numeroFallecidos || ''),
    matriculasImplicados: matriculasArr,
    autoridadInterviene: '',
    policiaLocalDe: datos.policiaLocal || '',
    guardiaCivilDe: datos.guardiaCivil || '',
    descripcionAccidente: datos.descripcionAccidente || '',
    observaciones: datos.observaciones || '',
    indicativosInforman: datos.indicativoCumplimenta || '',
    indicativoCumplimenta: datos.indicativoCumplimenta || '',
    responsableTurno: datos.responsableTurno || '',
    vbJefeServicio: '',
    firmaInformante: null,
    firmaResponsable: null,
    firmaJefe: null,
    desarrolloDetallado: datos.desarrolloDetallado || '',
    fotos: [],
  }

  return {
    fecha: datos.fecha ? new Date(datos.fecha + 'T12:00:00+02:00') : new Date(),
    lugar: String(datos.lugar || '').trim(),
    motivo: datos.motivo ? String(datos.motivo).trim() : null,
    alertante: datos.alertante ? String(datos.alertante).trim() : null,
    circulacion,
    horaLlamada: datos.horaLlamada || null,
    horaSalida: datos.horaSalida || null,
    horaLlegada: datos.horaLlegada || null,
    horaTerminado: datos.horaTerminado || null,
    horaDisponible: datos.horaDisponible || null,
    vehiculosIds: vehiculos,
    equipoWalkies,
    tipologias,
    tipologiasOtrosTexto: datos.otrosDescripcion ? { descripcion: datos.otrosDescripcion } : {},
    posiblesCausas: datos.posiblesCausas || null,
    tieneHeridos: !!datos.tieneHeridos,
    numeroHeridos: Number(datos.numeroHeridos) || 0,
    tieneFallecidos: !!datos.tieneFallecidos,
    numeroFallecidos: Number(datos.numeroFallecidos) || 0,
    matriculasImplicados: matriculasStr,
    policiaLocal: datos.policiaLocal || null,
    guardiaCivil: datos.guardiaCivil || null,
    descripcionAccidente: datos.descripcionAccidente || null,
    observaciones: datos.observaciones || '',
    desarrolloDetallado: datos.desarrolloDetallado || '',
    indicativosInforman: datos.indicativoCumplimenta || null,
    indicativoCumplimenta: datos.indicativoCumplimenta || null,
    responsableTurno: datos.responsableTurno || null,
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
    const { datos, imagenes = [] }: { datos: any; imagenes: string[] } = await request.json()

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
    const dbData = construirDatos(datos, imagenes)

    const parte = await prisma.partePSI.create({
      data: { ...dbData, numeroParte, creadoPorId: userId }
    })

    return NextResponse.json({ ok: true, parte })

  } catch (error: any) {
    console.error('[psi/importar/guardar]', error)
    return NextResponse.json({ error: error.message || 'Error guardando parte PSI' }, { status: 500 })
  }
}
