export type TimeKey = 'llamada' | 'salida' | 'llegada' | 'terminado' | 'disponible'

export type PsiFormState = {
    // Metadatos
    id?: string
    numero?: string

    fecha: string
    hora: string

    lugar: string
    motivo: string
    alertante: string

    // Pautas de tiempo
    tiempos: Record<TimeKey, string>

    // Tablas vehículos/equipo/walkies
    tabla1: Array<{ vehiculo: string; equipo: string; walkie: string }>
    tabla2: Array<{ equipo: string; walkie: string }>

    // Tipología
    prevencion: Record<'mantenimiento' | 'practicas' | 'suministros' | 'preventivo' | 'otros', boolean>
    intervencion: Record<'svb' | 'incendios' | 'inundaciones' | 'otros_riesgos_meteo' | 'activacion_pem_bor' | 'otros', boolean>
    otros: Record<'reunion_coordinacion' | 'reunion_areas' | 'limpieza' | 'formacion' | 'otros', boolean>

    otrosDescripcion: string
    posiblesCausas: string

    heridosSi: boolean
    heridosNo: boolean
    heridosNum: string

    fallecidosSi: boolean
    fallecidosNo: boolean
    fallecidosNum: string

    // Accidentes de tráfico
    matriculasImplicados: string[] // 5 casillas
    autoridadInterviene: string
    policiaLocalDe: string
    guardiaCivilDe: string

    observaciones: string

    indicativosInforman: string
    vbJefeServicio: string
    indicativoCumplimenta: string
    responsableTurno: string

    circulacion: string
    // Firmas (base64)
    firmaInformante: string | null
    firmaResponsable: string | null
    firmaJefe: string | null

    // Páginas adicionales
    desarrolloDetallado: string
    fotos: string[] // Array of base64 strings
}

export const INITIAL_PSI_STATE: PsiFormState = {
    numero: undefined,
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    lugar: '',
    motivo: '',
    alertante: '',
    circulacion: '',

    // Tablas
    tabla1: Array(8).fill({ vehiculo: '', equipo: '', walkie: '' }),
    tabla2: Array(8).fill({ equipo: '', walkie: '' }),

    // Tiempos
    tiempos: { llamada: '', salida: '', llegada: '', terminado: '', disponible: '' },

    // Tipología
    prevencion: { mantenimiento: false, practicas: false, suministros: false, preventivo: false, otros: false },
    intervencion: { svb: false, incendios: false, inundaciones: false, otros_riesgos_meteo: false, activacion_pem_bor: false, otros: false },
    otros: { reunion_coordinacion: false, reunion_areas: false, limpieza: false, formacion: false, otros: false },

    otrosDescripcion: '',
    posiblesCausas: '',

    // Casualties
    heridosSi: false, heridosNo: false, heridosNum: '',
    fallecidosSi: false, fallecidosNo: false, fallecidosNum: '',

    // Tráfico
    matriculasImplicados: Array(3).fill(''),
    autoridadInterviene: '',
    policiaLocalDe: '',
    guardiaCivilDe: '',

    observaciones: '',

    // Firmas texto
    indicativosInforman: '',
    responsableTurno: '',
    vbJefeServicio: '',
    indicativoCumplimenta: '',

    // Firmas imagen
    firmaInformante: null,
    firmaResponsable: null,
    firmaJefe: null,

    // Páginas adicionales
    desarrolloDetallado: '',
    fotos: []
}
