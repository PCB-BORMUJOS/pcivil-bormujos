// Estructura del Parte de Revisión de Feria (PRF), transcrita literalmente del
// modelo oficial. La usan tanto el formulario como el generador de PDF para que
// los ítems y etiquetas coincidan exactamente.

export type ValorCheck = 'si' | 'no' | 'na' | ''

export interface ItemCheck { key: string; label: string }

// ── 04 · Protección contra incendios · Extintores (checks bajo cada extintor) ──
export const EXTINTOR_ABC_CHECKS: ItemCheck[] = [
    { key: 'abc_presion', label: 'Presión de manómetro en zona verde' },
    { key: 'abc_ubicacion', label: 'Ubicación conforme al RD 513/2017' },
    { key: 'abc_senalizado', label: 'Visible y libre de obstáculos' },
]
export const EXTINTOR_CO2_CHECKS: ItemCheck[] = [
    { key: 'co2_lanza', label: 'Lanza y difusor sin daños' },
    { key: 'co2_ubicacion', label: 'Ubicación conforme al RD 513/2017' },
    { key: 'co2_senalizado', label: 'Visible y libre de obstáculos' },
]

// ── 05 · Instalación de gas y zona de cocina (RD 919/2006 · ITC-ICG) ──
export const GAS_IZQ: ItemCheck[] = [
    { key: 'gas_certificado', label: 'Certificado de gas en vigor' },
    { key: 'gas_manguera', label: 'Fecha de caducidad de la manguera' },
    { key: 'gas_regulador', label: 'Regulador y abrazaderas en buen estado' },
    { key: 'gas_plancha', label: 'Plancha metálica de protección instalada' },
    { key: 'gas_botellas', label: 'Botellas de GLP estables y ventiladas' },
]
export const GAS_DER: ItemCheck[] = [
    { key: 'gas_llave', label: 'Válvula accesible' },
    { key: 'gas_ventilacion', label: 'Ventilación de cocina correcta' },
    { key: 'gas_regletas', label: 'Sin regletas ni múltiples en la cocina' },
    { key: 'gas_separacion', label: 'Separación entre focos de calor y combustibles' },
    { key: 'gas_manta', label: 'Manta ignífuga o medio de extinción en cocina' },
]

// ── 06 · Documentación aportada por el titular (original o copia cotejada) ──
export const DOC_IZQ: ItemCheck[] = [
    { key: 'doc_autorizacion', label: 'Autorización municipal de instalación' },
    { key: 'doc_poliza', label: 'Póliza de R.C. y recibo de pago en vigor' },
    { key: 'doc_certgas', label: 'Certificado de la instalación de gas' },
]
export const DOC_DER: ItemCheck[] = [
    { key: 'doc_boletin', label: 'Boletín de la instalación eléctrica' },
    { key: 'doc_lonas', label: 'Certificado de reacción al fuego de lonas' },
    { key: 'doc_revextintores', label: 'Revisión de extintores por empresa habilitada' },
]

// ── 07 · Instalación eléctrica (REBT) ──
export const ELECTRICA: ItemCheck[] = [
    { key: 'ele_seta', label: 'Seta de corte visible y accesible' },
    { key: 'ele_cuadro', label: 'Cuadro con diferencial y magnetotérmicos' },
    { key: 'ele_multiples', label: 'Sin múltiples encadenados en la misma sección' },
    { key: 'ele_iluminacion', label: 'Iluminación separada de cortinas y lonas' },
    { key: 'ele_agua', label: 'Cables y múltiples fuera de zonas con agua' },
    { key: 'ele_incandescentes', label: 'Sin incandescentes junto a material combustible' },
    { key: 'ele_empalmes', label: 'Empalmes y conexiones protegidos y aislados' },
    { key: 'ele_alumbrado', label: 'Alumbrado de emergencia operativo' },
    { key: 'ele_grupo', label: 'Grupo electrógeno aislado y con extintor propio' },
]

// ── 08 · Evacuación y estructura ──
export const EVACUACION: ItemCheck[] = [
    { key: 'eva_salidas', label: 'Salidas libres de obstáculos · anchura 1,2 m' },
    { key: 'eva_numsalidas', label: 'Número de salidas adecuado al aforo' },
    { key: 'eva_senalizacion', label: 'Señalización de salidas visible en el interior' },
    { key: 'eva_paso', label: 'Espacio libre entre módulos de la caseta' },
    { key: 'eva_lonas', label: 'Lonas y textiles con certificado de reacción al fuego' },
    { key: 'eva_estructura', label: 'Estructura, anclajes y lastre en buen estado' },
    { key: 'eva_almacenamiento', label: 'Sin almacenamiento de combustibles en zona noble' },
    { key: 'eva_cartel', label: 'Cartel de aforo y prohibiciones expuesto' },
    { key: 'eva_botiquin', label: 'Botiquín disponible y accesible' },
]

/** Eficacia del extintor de polvo ABC (selector, no texto libre). */
export const EFICACIA_ABC = [
    { valor: '21A 113B C', label: 'Estándar · 21A 113B C' },
    { valor: '27A 183B C', label: 'Básica · 27A 183B C' },
    { valor: '34A 233B C', label: 'Alta · 34A 233B C' },
] as const

/** Eficacia del extintor de CO2 de 5 kg. */
export const EFICACIA_CO2 = [
    { valor: '89B',  label: 'Estándar · 89B' },
    { valor: '113B', label: 'Alta · 113B' },
] as const

/** El Vº Bº lo firma siempre el Jefe de Servicio. */
export const INDICATIVO_JEFE = 'J-44'

export const EJEMPLARES = [
    { valor: 'titular', label: 'Titular' },
    { valor: 'servicio', label: 'Servicio' },
    { valor: 'policia_local', label: 'Policía Local' },
] as const

export const RESULTADOS = [
    { key: 'apto', label: 'APTO' },
    { key: 'apto_condiciones', label: 'APTO CON CONDICIONES' },
    { key: 'no_apto', label: 'NO APTO' },
] as const

// Estado por defecto del formulario (datos). Los checks arrancan vacíos.
export function estadoInicialPRF() {
    const checks: Record<string, ValorCheck> = {}
    for (const it of [...EXTINTOR_ABC_CHECKS, ...EXTINTOR_CO2_CHECKS, ...GAS_IZQ, ...GAS_DER,
        ...DOC_IZQ, ...DOC_DER, ...ELECTRICA, ...EVACUACION]) checks[it.key] = ''
    return {
        expediente: '', fecha: '', horaInicio: '', horaFin: '',
        // "Indicativo que informa" y "Equipo" eran lo mismo: se unifican en dos
        // huecos de indicativo, que además alimentan el pie de firmas.
        indicativos: ['', ''] as string[],
        policiaTip1: '', policiaTip2: '',
        // El acta puede extenderse en varios ejemplares a la vez.
        ejemplares: [] as string[],
        // 01
        nombreCaseta: '', numeroCaseta: '', modulos: '' as '' | '1' | '2' | '3' | 'otros', modulosOtros: '',
        calleSector: '', localidad: '', aforo: '',
        // 02
        tomadorNombre: '', tomadorDni: '', tomadorDomicilio: '', tomadorLocalidad: '', tomadorTelefonos: '', tomadorEmail: '',
        // 03
        polizaCompania: '', polizaNumero: '', polizaVigencia: '', polizaRecibo: '' as '' | 'si' | 'no',
        // 04
        abcNumero: '', abcPrecinto: '' as '' | 'si' | 'no', abcEficacia: '', abcRevision: '',
        co2Numero: '', co2Precinto: '' as '' | 'si' | 'no', co2Eficacia: '', co2Revision: '',
        precintoVerificacion: ['', '', '', '', ''] as string[],
        // 05 · datos que acompañan a los checks de gas
        gasBotellasNum: '', gasCertificadoFecha: '', gasMangueraCaducidad: '',
        // 08 anchuras
        evaSalidasAnchura: '', evaPasoAnchura: '',
        // 09
        obsZonaNoble: '', obsZonaCocina: '',
        // 11
        resultado: '' as '' | 'apto' | 'apto_condiciones' | 'no_apto',
        requerimientos: '', plazoLimite: '', reinspeccion: '', reinspeccionHora: '',
        // Firmas manuscritas (PNG en base64), una por firmante
        firmaInforma1: '', firmaInforma2: '', firmaJefe: '', firmaTomador: '',
        tomadorFirmaNombre: '',
        checks,
    }
}

export type PrfDatos = ReturnType<typeof estadoInicialPRF>
