// Estructura del Parte de Soporte Vital Básico (PAS), transcrita literalmente
// del modelo oficial. La usan el formulario y la hoja imprimible, de modo que
// los rótulos y su orden coincidan exactamente con el documento.

export type ValorSiNo = 'si' | 'no' | ''
export interface Item { key: string; label: string }

// ── Vía aérea ────────────────────────────────────────────────────────────────
export const VIA_AEREA: Item[] = [
    { key: 'va_permeable', label: 'Permeable' },
    { key: 'va_no_permeable', label: 'No permeable' },
    { key: 'va_cpo_extranio', label: 'Cpo. extraño' },
    { key: 'va_vomito', label: 'Vómito' },
    { key: 'va_sangre', label: 'Sangre' },
    { key: 'va_protesis', label: 'Prótesis' },
    { key: 'va_aspiracion', label: 'Aspiración' },
    { key: 'va_guedel', label: 'Guedel' },
]

// ── Circulación (dos tandas: 1ª y 2ª) ────────────────────────────────────────
export const CIRCULACION: { grupo: string; items: Item[] }[] = [
    {
        grupo: 'Coloración',
        items: [
            { key: 'ci_normal', label: 'Normal' },
            { key: 'ci_palidez', label: 'Palidez' },
            { key: 'ci_cianosis', label: 'Cianosis' },
            { key: 'ci_sudoracion', label: 'Sudoración' },
        ],
    },
    {
        grupo: 'Pulso perife.',
        items: [
            { key: 'ci_lleno', label: 'Lleno' },
            { key: 'ci_filiforme', label: 'Filiforme' },
            { key: 'ci_ausente', label: 'Ausente' },
        ],
    },
    {
        grupo: 'Pulso caroti.',
        items: [
            { key: 'ci_caro_presente', label: 'Presente' },
            { key: 'ci_caro_ausente', label: 'Ausente' },
        ],
    },
]

// ── RCP ──────────────────────────────────────────────────────────────────────
export const RCP_SINO: Item[] = [
    { key: 'rcp_pcr_presenciada', label: 'PCR presenciada' },
    { key: 'rcp_maniobra', label: 'Maniobra RCP' },
    { key: 'rcp_dea', label: 'DEA' },
]
export const RCP_DATOS: Item[] = [
    { key: 'rcpDescargas', label: 'Nº de descargas' },
    { key: 'rcpTiempoSvb', label: 'Tiempo RCP SVB min.' },
    { key: 'rcpHoraRecuperacion', label: 'Hora recuperación / pulso' },
]

// ── Neurología (dos tandas: 1ª y 2ª, cada una Sí/No) ─────────────────────────
export const NEUROLOGIA: Item[] = [
    { key: 'ne_orientacion', label: 'Orientación' },
    { key: 'ne_desorientacion', label: 'Desorientación' },
    { key: 'ne_perdida_memoria', label: 'Pérdida de memoria' },
    { key: 'ne_asimetria_facial', label: 'Asimetría facial' },
    { key: 'ne_deficits_motores', label: 'Déficits motores' },
    { key: 'ne_deficits_sensibilidad', label: 'Déficits de sensibilidad' },
    { key: 'ne_relajacion_esfinteres', label: 'Relajación de esfínteres' },
    { key: 'ne_convulsiones', label: 'Convulsiones' },
    { key: 'ne_inconsciencia', label: 'Inconsciencia' },
]

// ── Inmovilización ───────────────────────────────────────────────────────────
export const INMOVILIZACION: Item[] = [
    { key: 'in_collarin', label: 'Collarín' },
    { key: 'in_fernokit', label: 'Fernokit' },
    { key: 'in_inm_cabeza', label: 'Inm. cabeza' },
    { key: 'in_camilla_tijera', label: 'Camilla tijera' },
    { key: 'in_colchon_vacio', label: 'Colchón de vacío' },
    { key: 'in_ferula_ms', label: 'Férula M.S.' },
    { key: 'in_ferula_mi', label: 'Férula M.I.' },
    { key: 'in_ferula_tracc', label: 'Férula tracc.' },
    { key: 'in_paniuelo_tria', label: 'Pañuelo tria.' },
]

// ── Traslado ─────────────────────────────────────────────────────────────────
export const TRASLADO: Item[] = [
    { key: 'tr_d_supino', label: 'D. supino' },
    { key: 'tr_d_prono', label: 'D. prono' },
    { key: 'tr_d_lateral', label: 'D. lateral' },
    { key: 'tr_trendelemburg', label: 'Trendelemburg' },
    { key: 'tr_anti_trendelem', label: 'Anti trendelem' },
    { key: 'tr_semisentado', label: 'Semisentado' },
    { key: 'tr_sentado', label: 'Sentado' },
    { key: 'tr_antialgica', label: 'Antiálgica' },
    { key: 'tr_pls', label: 'P.L.S.' },
]

// ── Escala de coma de Glasgow ────────────────────────────────────────────────
export const GLASGOW_OCULAR = [
    { p: 4, label: 'Espontáneo' },
    { p: 3, label: 'Estímulo verbal' },
    { p: 2, label: 'Estímulo doloroso' },
    { p: 1, label: 'Sin respuesta' },
] as const
export const GLASGOW_VERBAL = [
    { p: 5, label: 'Conversa orientado' },
    { p: 4, label: 'Conversa desorientado' },
    { p: 3, label: 'Palabras inadecuadas' },
    { p: 2, label: 'Sonidos incomprensibles' },
    { p: 1, label: 'Sin respuesta' },
] as const
export const GLASGOW_MOTORA = [
    { p: 6, label: 'Obedece órdenes' },
    { p: 5, label: 'Localiza dolor' },
    { p: 4, label: 'Retrae al dolor' },
    { p: 3, label: 'Flexión anormal' },
    { p: 2, label: 'Extensión anormal' },
    { p: 1, label: 'Sin respuesta' },
] as const

/** Glasgow total: la suma de las tres respuestas, de 3 a 15. */
export function totalGlasgow(o?: number, v?: number, m?: number): number | null {
    if (!o || !v || !m) return null
    return o + v + m
}

// ── Tabla de lesiones (los números que se marcan sobre las figuras) ──────────
export const LESIONES: { n: number; label: string }[] = [
    { n: 1, label: 'Dolor' },
    { n: 2, label: 'Contusión' },
    { n: 3, label: 'Inflamación' },
    { n: 4, label: 'Irritación' },
    { n: 5, label: 'Fractura con defor.' },
    { n: 6, label: 'Hemorragia' },
    { n: 7, label: 'Herida contusa' },
    { n: 8, label: 'Herida penetrante' },
    { n: 9, label: 'Impotencia funcional' },
    { n: 10, label: 'Deformidad' },
    { n: 11, label: 'Aplastamiento' },
    { n: 12, label: 'Amputación' },
    { n: 13, label: 'Quemadura' },
]

// ── Regla de los nueves, tal como figura en el modelo ────────────────────────
export const QUEMADURAS: { zona: string; ninios: number; adultos: number }[] = [
    { zona: 'Cabeza', ninios: 18, adultos: 9 },
    { zona: 'Espalda', ninios: 18, adultos: 18 },
    { zona: 'Frontal', ninios: 18, adultos: 18 },
    { zona: 'Genitales', ninios: 1, adultos: 1 },
    { zona: 'M.S. x 2', ninios: 9, adultos: 9 },
    { zona: 'M.I. x 2', ninios: 18, adultos: 18 },
    { zona: 'M.I.I.', ninios: 9, adultos: 9 },
    { zona: 'M.I.D.', ninios: 9, adultos: 9 },
    { zona: 'Pecho', ninios: 9, adultos: 9 },
    { zona: 'Abdomen', ninios: 9, adultos: 9 },
]

/** Momentos que se cronometran en el recuadro «Pautas de tiempo». */
export const PAUTAS_TIEMPO: Item[] = [
    { key: 'tLlamada', label: 'Llamada' },
    { key: 'tSalida', label: 'Salida' },
    { key: 'tLlegada', label: 'Llegada' },
    { key: 'tTerminado', label: 'Terminado' },
    { key: 'tDisponible', label: 'Disponible' },
]

/** Una tanda de constantes: el modelo recoge dos, 1ª y 2ª. */
export function constantesVacias() {
    return {
        hora: '', fr: '', fc: '', ta: '',
        respiracion: '' as '' | 'norm' | 'ansi' | 'asin',
        oxiLmin: '', oxiFio2: '',
        saturacion: '', glucosa: '',
        glasgowO: 0, glasgowV: 0, glasgowM: 0, glasgowT: 0,
        pupilas: '' as '' | 'isocoria' | 'miosis' | 'midriasis' | 'anisocoria',
        reactivas: '' as ValorSiNo,
    }
}

export function estadoInicialPAS() {
    const checks: Record<string, boolean> = {}
    for (const it of [...VIA_AEREA, ...INMOVILIZACION, ...TRASLADO]) checks[it.key] = false

    // Circulación y neurología se recogen por duplicado (1ª y 2ª valoración).
    const dobles: Record<string, ValorSiNo> = {}
    for (const g of CIRCULACION) for (const it of g.items) { dobles[it.key + '_1'] = ''; dobles[it.key + '_2'] = '' }
    for (const it of NEUROLOGIA) { dobles[it.key + '_1'] = ''; dobles[it.key + '_2'] = '' }

    const sino: Record<string, ValorSiNo> = {}
    for (const it of RCP_SINO) sino[it.key] = ''
    sino['rcp_inicio_sva'] = ''

    return {
        // Cabecera
        fecha: '', hora: '', numeroInforme: '',
        lugar: '', motivo: '', alertante: '',
        vehiculos: ['', '', ''] as string[],
        equipo: ['', '', ''] as string[],
        tLlamada: '', tSalida: '', tLlegada: '', tTerminado: '', tDisponible: '',

        // Filiación del paciente
        nombre: '', apellidos: '', edad: '', sexo: '' as '' | 'H' | 'M',
        domicilio: '', numero: '', bloque: '', piso: '', puerta: '', letra: '', cp: '',
        localidad: '', provincia: '', dniNie: '', telefono: '',

        // Constantes: dos tandas
        constantes: [constantesVacias(), constantesVacias()],

        // Bloques de exploración
        checks, dobles, sino,
        rcpDescargas: '', rcpTiempoSvb: '', rcpHoraRecuperacion: '', rcpHoraInicioSva: '',

        // Texto libre
        antecedentes: '', demandas: '', observaciones: '',

        // Accidentes de tráfico
        matriculas: ['', '', '', '', ''] as string[],
        policiaLocalDe: '', guardiaCivilDe: '',

        // Renuncia del paciente
        renunciaSinTraslado: false,
        renunciaSinAsistencia: false,
        testigo1: '', testigo2: '',

        // Firmas
        indicativosIntervienen: ['', ''] as string[],
        firmaIndicativos: '', firmaJefe: '',
    }
}

export type PasDatos = ReturnType<typeof estadoInicialPAS>

/** Marca de lesión colocada sobre una de las figuras anatómicas. */
export type MarcaLesion = {
    /** Qué figura: 0 frontal, 1 dorsal, 2 y 3 las femeninas. */
    figura: number
    /** Posición en tanto por ciento del ancho y alto de la figura. */
    x: number
    y: number
    /** Número de la tabla de lesiones (1 a 13). */
    codigo: number
}
