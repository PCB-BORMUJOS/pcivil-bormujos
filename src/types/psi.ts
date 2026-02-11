export type TimeKey = 'llamada' | 'salida' | 'llegada' | 'terminado' | 'disponible'

export type PsiFormState = {
    // Metadatos
    id?: string
    numero?: string

    fecha: string
    hora: string
    numeroInforme: string

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
}

export const INITIAL_PSI_STATE: PsiFormState = {
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    numeroInforme: '',

    lugar: '',
    motivo: '',
    alertante: '',

    tiempos: {
        llamada: '',
        salida: '',
        llegada: '',
        terminado: '',
        disponible: '',
    },

    tabla1: Array.from({ length: 9 }, () => ({ vehiculo: '', equipo: '', walkie: '' })),
    tabla2: Array.from({ length: 9 }, () => ({ equipo: '', walkie: '' })),

    prevencion: {
        mantenimiento: false,
        practicas: false,
        suministros: false,
        preventivo: false,
        otros: false,
    },
    intervencion: {
        svb: false,
        incendios: false,
        inundaciones: false,
        otros_riesgos_meteo: false,
        activacion_pem_bor: false,
        otros: false,
    },
    otros: {
        reunion_coordinacion: false,
        reunion_areas: false,
        limpieza: false,
        formacion: false,
        otros: false,
    },

    otrosDescripcion: '',
    posiblesCausas: '',

    heridosSi: false,
    heridosNo: false,
    heridosNum: '',

    fallecidosSi: false,
    fallecidosNo: false,
    fallecidosNum: '',

    matriculasImplicados: Array.from({ length: 5 }, () => ''),
    autoridadInterviene: '',
    policiaLocalDe: '',
    guardiaCivilDe: '',

    observaciones: '',

    indicativosInforman: '',
    vbJefeServicio: '',
    indicativoCumplimenta: '',
    responsableTurno: '',

    circulacion: '',
}
