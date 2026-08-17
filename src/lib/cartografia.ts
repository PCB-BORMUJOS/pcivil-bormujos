/**
 * Catálogo de cartografía oficial.
 *
 * Todas estas capas están verificadas con peticiones GetMap reales sobre el
 * término de Bormujos: devuelven imagen, no un XML de error. Si alguna deja de
 * funcionar, el visor la marca en rojo en lugar de quedarse en blanco.
 *
 * No se descarga ni se almacena nada: son servicios públicos del IGN, la
 * Dirección General del Catastro y el Instituto de Estadística y Cartografía de
 * Andalucía, que se pintan directamente sobre el mapa.
 */

export type CapaOficial = {
    clave: string
    nombre: string
    descripcion: string
    categoria: 'base' | 'tematica'
    wmsUrl: string
    wmsLayers: string
    wmsVersion: '1.1.1' | '1.3.0'
    wmsFormat: string
    transparente: boolean
    atribucion: string
    opacidad: number
    visiblePorDefecto: boolean
    orden: number
}

/** Coordenadas y encuadre de Bormujos. */
export const BORMUJOS = {
    centro: [37.3710, -6.0719] as [number, number],
    zoom: 14,
    zoomMin: 9,
    zoomMax: 19,
}

/**
 * Capas BASE: el fondo del mapa. Son excluyentes, solo una a la vez.
 */
export const CAPAS_BASE: CapaOficial[] = [
    {
        clave: 'callejero',
        nombre: 'Callejero',
        descripcion: 'Mapa de calles estándar. El fondo por defecto para localizar direcciones.',
        categoria: 'base',
        wmsUrl: '',            // OpenStreetMap: teselas directas, no WMS
        wmsLayers: '',
        wmsVersion: '1.1.1',
        wmsFormat: 'image/png',
        transparente: false,
        atribucion: '© OpenStreetMap',
        opacidad: 1,
        visiblePorDefecto: true,
        orden: 1,
    },
    {
        clave: 'ortofoto',
        nombre: 'Ortofoto (PNOA)',
        descripcion: 'Fotografía aérea oficial de máxima actualidad del Plan Nacional de Ortofotografía Aérea.',
        categoria: 'base',
        wmsUrl: 'https://www.ign.es/wms-inspire/pnoa-ma',
        wmsLayers: 'OI.OrthoimageCoverage',
        wmsVersion: '1.3.0',
        wmsFormat: 'image/jpeg',
        transparente: false,
        atribucion: '© Instituto Geográfico Nacional · PNOA',
        opacidad: 1,
        visiblePorDefecto: false,
        orden: 2,
    },
    {
        clave: 'topografico',
        nombre: 'Topográfico (MTN)',
        descripcion: 'Mapa Topográfico Nacional: curvas de nivel, relieve, caminos y toponimia.',
        categoria: 'base',
        wmsUrl: 'https://www.ign.es/wms-inspire/mapa-raster',
        wmsLayers: 'mtn_rasterizado',
        wmsVersion: '1.3.0',
        wmsFormat: 'image/png',
        transparente: false,
        atribucion: '© Instituto Geográfico Nacional · MTN',
        opacidad: 1,
        visiblePorDefecto: false,
        orden: 3,
    },
    {
        clave: 'toporaster-andalucia',
        nombre: 'Topográfico de Andalucía',
        descripcion: 'Cartografía topográfica 1:10.000 de la Junta de Andalucía, con más detalle local que el MTN.',
        categoria: 'base',
        wmsUrl: 'https://www.ideandalucia.es/services/toporaster10/wms',
        wmsLayers: 'toporaster10',
        wmsVersion: '1.1.1',
        wmsFormat: 'image/png',
        transparente: false,
        atribucion: '© Instituto de Estadística y Cartografía de Andalucía',
        opacidad: 1,
        visiblePorDefecto: false,
        orden: 4,
    },
]

/**
 * Capas TEMÁTICAS: se superponen al fondo y se pueden combinar libremente.
 */
export const CAPAS_TEMATICAS: CapaOficial[] = [
    {
        clave: 'termino-municipal',
        nombre: 'Término municipal',
        descripcion: 'Límite administrativo del municipio. Delimita hasta dónde llega la competencia del servicio.',
        categoria: 'tematica',
        wmsUrl: 'https://www.ign.es/wms-inspire/unidades-administrativas',
        wmsLayers: 'AU.AdministrativeBoundary',
        wmsVersion: '1.3.0',
        wmsFormat: 'image/png',
        transparente: true,
        atribucion: '© Instituto Geográfico Nacional',
        opacidad: 0.9,
        visiblePorDefecto: true,
        orden: 1,
    },
    {
        clave: 'catastro',
        nombre: 'Parcelario catastral',
        descripcion: 'Parcelas y construcciones del Catastro. Útil para localizar un edificio concreto y sus lindes.',
        categoria: 'tematica',
        wmsUrl: 'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
        wmsLayers: 'Catastro',
        wmsVersion: '1.1.1',
        wmsFormat: 'image/png',
        transparente: true,
        atribucion: '© Dirección General del Catastro',
        opacidad: 0.75,
        visiblePorDefecto: false,
        orden: 2,
    },
    {
        clave: 'hidrografia-rios',
        nombre: 'Red hidrográfica',
        descripcion: 'Ríos, arroyos y cauces de Andalucía. Base para valorar el riesgo por avenidas.',
        categoria: 'tematica',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g3_hidrografia/wms',
        wmsLayers: 'g03_01_Rio',
        wmsVersion: '1.1.1',
        wmsFormat: 'image/png',
        transparente: true,
        atribucion: '© IECA · Datos Espaciales de Referencia de Andalucía',
        opacidad: 0.9,
        visiblePorDefecto: false,
        orden: 3,
    },
    {
        clave: 'hidrografia-masas',
        nombre: 'Masas de agua',
        descripcion: 'Embalses, lagunas y láminas de agua permanentes.',
        categoria: 'tematica',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g3_hidrografia/wms',
        wmsLayers: 'g03_02_MasaAgua',
        wmsVersion: '1.1.1',
        wmsFormat: 'image/png',
        transparente: true,
        atribucion: '© IECA · Datos Espaciales de Referencia de Andalucía',
        opacidad: 0.8,
        visiblePorDefecto: false,
        orden: 4,
    },
]

export const TODAS_LAS_CAPAS_OFICIALES = [...CAPAS_BASE, ...CAPAS_TEMATICAS]

/** Teselas del callejero de fondo (no es WMS). */
export const TILES_CALLEJERO = {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}

// ── Tipos y utilidades de planes ────────────────────────────────────────────

export type TipoPlan = 'ptel' | 'edificio' | 'evento'

export const TIPOS_PLAN: Record<TipoPlan, { label: string; singular: string; descripcion: string }> = {
    ptel: {
        label: 'PTEL',
        singular: 'Plan Territorial',
        descripcion: 'Plan Territorial de Emergencias Local: el marco general de respuesta del municipio.',
    },
    edificio: {
        label: 'Edificios públicos',
        singular: 'Plan de autoprotección',
        descripcion: 'Planes de autoprotección de colegios, polideportivos, centros culturales y demás edificios municipales.',
    },
    evento: {
        label: 'Eventos',
        singular: 'Plan específico',
        descripcion: 'Planes para eventos puntuales: Feria, Cabalgata, romerías y actos multitudinarios.',
    },
}

export type EstadoVigencia = 'vigente' | 'proxima' | 'caducado' | 'sin_fecha'

export const ESTADOS_VIGENCIA: Record<EstadoVigencia, { label: string; clases: string; punto: string }> = {
    vigente:   { label: 'Vigente',          clases: 'bg-emerald-50 text-emerald-700 border-emerald-200', punto: 'bg-emerald-500' },
    proxima:   { label: 'Revisión próxima', clases: 'bg-amber-50 text-amber-700 border-amber-200',       punto: 'bg-amber-500' },
    caducado:  { label: 'Caducado',         clases: 'bg-red-50 text-red-700 border-red-200',             punto: 'bg-red-500' },
    sin_fecha: { label: 'Sin fecha',        clases: 'bg-slate-100 text-slate-500 border-slate-200',      punto: 'bg-slate-400' },
}

/** Días de antelación con los que se avisa de una revisión que se acerca. */
export const DIAS_AVISO_REVISION = 90

/**
 * Estado de vigencia de un plan a partir de su fecha límite de revisión.
 * Se compara en día natural español, sin horas, para que no baile por zona
 * horaria: un plan que caduca hoy todavía cuenta como vigente.
 */
export function estadoVigencia(fechaRevision: string | Date | null | undefined): EstadoVigencia {
    if (!fechaRevision) return 'sin_fecha'
    const limite = new Date(fechaRevision)
    if (isNaN(limite.getTime())) return 'sin_fecha'

    const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
    const hoy = new Date(`${hoyStr}T00:00:00Z`)
    const lim = new Date(`${limite.toISOString().slice(0, 10)}T00:00:00Z`)

    const dias = Math.round((lim.getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) return 'caducado'
    if (dias <= DIAS_AVISO_REVISION) return 'proxima'
    return 'vigente'
}

/** Días que faltan (negativo si ya pasó). null si no hay fecha. */
export function diasHastaRevision(fechaRevision: string | Date | null | undefined): number | null {
    if (!fechaRevision) return null
    const limite = new Date(fechaRevision)
    if (isNaN(limite.getTime())) return null
    const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
    const hoy = new Date(`${hoyStr}T00:00:00Z`)
    const lim = new Date(`${limite.toISOString().slice(0, 10)}T00:00:00Z`)
    return Math.round((lim.getTime() - hoy.getTime()) / 86400000)
}

/** Texto humano del plazo: "faltan 45 días", "caducó hace 12 días", "vence hoy". */
export function textoPlazo(fechaRevision: string | Date | null | undefined): string {
    const d = diasHastaRevision(fechaRevision)
    if (d === null) return 'Sin fecha de revisión'
    if (d === 0) return 'Vence hoy'
    if (d < 0) {
        const n = Math.abs(d)
        return n === 1 ? 'Caducó ayer' : `Caducó hace ${n} días`
    }
    if (d === 1) return 'Vence mañana'
    if (d < 60) return `Faltan ${d} días`
    const meses = Math.round(d / 30)
    return `Faltan ${meses} meses`
}

export const NIVELES_RIESGO = ['bajo', 'medio', 'alto'] as const
export const TIPOS_DOCUMENTO = [
    { valor: 'plan',        label: 'Plan completo' },
    { valor: 'anexo',       label: 'Anexo' },
    { valor: 'plano',       label: 'Plano' },
    { valor: 'certificado', label: 'Certificado' },
    { valor: 'otro',        label: 'Otro' },
] as const
