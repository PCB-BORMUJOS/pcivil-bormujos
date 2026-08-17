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
    /// Sección del panel de capas.
    grupo: string
    wmsUrl: string
    wmsLayers: string
    wmsVersion: '1.1.1' | '1.3.0'
    wmsFormat: string
    transparente: boolean
    atribucion: string
    opacidad: number
    visiblePorDefecto: boolean
    orden: number
    /// Capas vectoriales locales (GeoJSON servido desde /public) en lugar de WMS.
    /// Cuando está presente, la capa se pinta como GeoJSON, no como tesela WMS.
    geojsonUrl?: string
    /// Color del trazo para capas GeoJSON.
    color?: string
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
        grupo: 'Fondo',
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
        grupo: 'Fondo',
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
        grupo: 'Fondo',
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
        grupo: 'Fondo',
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
    {
        clave: 'bca10',
        nombre: 'Base topográfica 1:10.000 (BCA)',
        descripcion: 'Base Cartográfica de Andalucía 1:10.000 del IECA: máximo detalle local — edificaciones, viario, hidrografía, relieve, servicios y toponimia. El mejor fondo operativo del municipio.',
        categoria: 'base',
        grupo: 'Fondo',
        wmsUrl: 'https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/bca/wms',
        wmsLayers: '00_BCA',
        wmsVersion: '1.3.0',
        wmsFormat: 'image/png',
        transparente: false,
        atribucion: '© Instituto de Estadística y Cartografía de Andalucía · BCA10',
        opacidad: 1,
        visiblePorDefecto: false,
        orden: 5,
    },
]

/**
 * Capas TEMÁTICAS: se superponen al fondo y se pueden combinar libremente.
 */
export const CAPAS_TEMATICAS: CapaOficial[] = [
    {
        clave: 'termino-municipal',
        nombre: 'Término municipal',
        descripcion: 'Límite administrativo oficial de Bormujos, resaltado en color de alto contraste para que se aprecie sobre cualquier fondo.',
        categoria: 'tematica',
        grupo: 'Territorio',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png',
        transparente: true,
        geojsonUrl: '/cartografia/termino-bormujos.geojson', color: '#ff179c',
        atribucion: '© IECA · DERA',
        opacidad: 0.85,
        visiblePorDefecto: true,
        orden: 1,
    },
    {
        clave: 'catastro',
        nombre: 'Parcelario catastral',
        descripcion: 'Parcelas y construcciones del Catastro. Útil para localizar un edificio concreto y sus lindes.',
        categoria: 'tematica',
        grupo: 'Territorio',
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
        grupo: 'Hidrografía',
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
        grupo: 'Hidrografía',
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

    // ── Relieve y topografía ────────────────────────────────────────────────
    {
        clave: 'curvas-nivel',
        nombre: 'Curvas de nivel',
        descripcion: 'Curvas de nivel del MDT de Andalucía, en color de alto contraste para leerlas sobre ortofoto o topográfico.',
        categoria: 'tematica', grupo: 'Relieve',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/curvas-bormujos.geojson', color: '#ff6a00',
        atribucion: '© IECA · DERA',
        opacidad: 0.9, visiblePorDefecto: false, orden: 10,
    },
    {
        clave: 'altimetria',
        nombre: 'Intervalos altimétricos',
        descripcion: 'Cotas por franjas de color. Permite leer de un vistazo las zonas altas y las hondonadas donde se acumula el agua.',
        categoria: 'tematica', grupo: 'Relieve',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g1_relieve/wms',
        wmsLayers: 'g01_05_IntervaloAltimetrico',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.55, visiblePorDefecto: false, orden: 11,
    },

    // ── Red viaria y accesos ────────────────────────────────────────────────
    {
        clave: 'carreteras',
        nombre: 'Red de carreteras',
        descripcion: 'Red viaria oficial. Base para el plano de accesos y para trazar las vías de evacuación.',
        categoria: 'tematica', grupo: 'Viario y accesos',
        wmsUrl: 'https://servicios.idee.es/wms-inspire/transportes',
        wmsLayers: 'TN.RoadTransportNetwork.RoadLink',
        wmsVersion: '1.3.0', wmsFormat: 'image/png', transparente: true,
        atribucion: '© Instituto Geográfico Nacional',
        opacidad: 0.9, visiblePorDefecto: false, orden: 20,
    },
    {
        clave: 'ferrocarril',
        nombre: 'Red ferroviaria',
        descripcion: 'Líneas de ferrocarril, relevantes para riesgo de transporte de mercancías peligrosas.',
        categoria: 'tematica', grupo: 'Viario y accesos',
        wmsUrl: 'https://servicios.idee.es/wms-inspire/transportes',
        wmsLayers: 'TN.RailTransportNetwork.RailwayLink',
        wmsVersion: '1.3.0', wmsFormat: 'image/png', transparente: true,
        atribucion: '© Instituto Geográfico Nacional',
        opacidad: 0.9, visiblePorDefecto: false, orden: 21,
    },

    // ── Usos del suelo ──────────────────────────────────────────────────────
    {
        clave: 'usos-suelo',
        nombre: 'Usos del suelo',
        descripcion: 'Cubierta y uso del suelo de Andalucía. Base para el riesgo de incendio forestal y para el plano de usos.',
        categoria: 'tematica', grupo: 'Usos del suelo',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g6_usos_suelo/wms',
        wmsLayers: 'g06_01_UsoSuelo',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.6, visiblePorDefecto: false, orden: 30,
    },
    {
        clave: 'espacios-protegidos',
        nombre: 'Espacios naturales protegidos',
        descripcion: 'Figuras de protección ambiental. Contexto para el riesgo de incendio forestal y el ámbito del INFOCA.',
        categoria: 'tematica', grupo: 'Usos del suelo',
        wmsUrl: 'https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Espacios_Naturales_Protegidos',
        wmsLayers: 'eennpp',
        wmsVersion: '1.3.0', wmsFormat: 'image/png', transparente: true,
        atribucion: '© REDIAM · Junta de Andalucía',
        opacidad: 0.6, visiblePorDefecto: false, orden: 31,
    },

    // ── Población y elementos vulnerables ───────────────────────────────────
    {
        clave: 'nucleos-urbanos',
        nombre: 'Núcleos urbanos',
        descripcion: 'Delimitación de los núcleos de población: la mancha urbana a proteger.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g7_sistema_urbano/wms',
        wmsLayers: 'g07_07_NucleosUrbanos_pol',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.5, visiblePorDefecto: false, orden: 40,
    },
    {
        clave: 'manzanas',
        nombre: 'Manzanas urbanas',
        descripcion: 'Trama de manzanas. Útil para sectorizar el municipio en la cartografía operativa del CECOPAL.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g7_sistema_urbano/wms',
        wmsLayers: 'g07_04_Manzana',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.55, visiblePorDefecto: false, orden: 41,
    },
    {
        clave: 'zonas-verdes',
        nombre: 'Zonas verdes',
        descripcion: 'Parques y espacios libres: candidatos naturales a zona de concentración o área de seguridad.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g7_sistema_urbano/wms',
        wmsLayers: 'g07_06_ZonaVerde',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.7, visiblePorDefecto: false, orden: 42,
    },

    // ── Medios, recursos y equipamientos sensibles ──────────────────────────
    {
        clave: 'centros-salud',
        nombre: 'Centros de salud',
        descripcion: 'Centros de atención primaria. Recurso sanitario y, a la vez, elemento vulnerable.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_01_CentroSalud',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 50,
    },
    {
        clave: 'hospitales',
        nombre: 'Hospitales',
        descripcion: 'Hospitales y centros de alta resolución de referencia para evacuación sanitaria.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_02_Hospital_CAE',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 51,
    },
    {
        clave: 'farmacias',
        nombre: 'Farmacias',
        descripcion: 'Oficinas de farmacia, recurso de apoyo en emergencias sanitarias.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_04_Farmacia',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 52,
    },
    {
        clave: 'centros-educativos',
        nombre: 'Centros educativos',
        descripcion: 'Colegios e institutos: población especialmente vulnerable y, muchos de ellos, con plan de autoprotección propio.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_05_CentroEducativo',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 53,
    },
    {
        clave: 'ayuntamiento',
        nombre: 'Ayuntamiento y sedes',
        descripcion: 'Sede municipal, donde se constituye el CECOPAL.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_11_Ayuntamiento',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 54,
    },
    // ── Medios operativos de emergencia ─────────────────────────────────────
    {
        clave: 'bomberos',
        nombre: 'Parques de bomberos',
        descripcion: 'Parques de bomberos de referencia. Medio operativo de intervención de primer orden.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_29_ParqueBomberos',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 55,
    },
    {
        clave: 'policia',
        nombre: 'Policía',
        descripcion: 'Dependencias de Policía Local y Nacional. Coordinación de seguridad y cortes de tráfico.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_26_Policia',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 56,
    },
    {
        clave: 'guardia-civil',
        nombre: 'Guardia Civil',
        descripcion: 'Cuarteles y puestos de la Guardia Civil.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_34_GuardiaCivil',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 57,
    },
    {
        clave: 'gestion-emergencias',
        nombre: 'Gestión de emergencias (112)',
        descripcion: 'Centros de gestión de emergencias y coordinación (112 / CECOP). Enlace operativo del PTEL.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_35_GestionEmergencias',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 58,
    },
    {
        clave: 'org-humanitarias',
        nombre: 'Organizaciones humanitarias',
        descripcion: 'Cruz Roja y otras organizaciones de apoyo. Refuerzo sanitario y logístico y gestión de albergues.',
        categoria: 'tematica', grupo: 'Medios y equipamientos',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_36_OrganizacionesHumanitarias',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 59,
    },

    // ── Puntos de concentración / albergue y vulnerables ────────────────────
    {
        clave: 'instalaciones-deportivas',
        nombre: 'Instalaciones deportivas',
        descripcion: 'Polideportivos y campos: candidatos naturales a zona de concentración, albergue o área de socorro.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_24_InstalacionesDeportivas',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 43,
    },
    {
        clave: 'gran-comercio',
        nombre: 'Grandes superficies',
        descripcion: 'Centros y grandes superficies comerciales: alta concentración de personas y elemento vulnerable.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_14_GranComercio',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 44,
    },
    {
        clave: 'edificios-religiosos',
        nombre: 'Edificios religiosos',
        descripcion: 'Iglesias y templos: concentración pública en actos y romerías, y elemento patrimonial.',
        categoria: 'tematica', grupo: 'Población y vulnerables',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wms',
        wmsLayers: 'g12_13_EdificioReligioso',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 1, visiblePorDefecto: false, orden: 45,
    },

    // ── Riesgo tecnológico e industrial ─────────────────────────────────────
    {
        clave: 'espacio-productivo',
        nombre: 'Polígonos y espacios productivos',
        descripcion: 'Suelo industrial y espacios productivos: foco de riesgo tecnológico e industrial del municipio.',
        categoria: 'tematica', grupo: 'Riesgo tecnológico e industrial',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g8_tejido_economico/wms',
        wmsLayers: 'g08_01_EspacioProductivo',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.65, visiblePorDefecto: false, orden: 60,
    },
    {
        clave: 'area-logistica',
        nombre: 'Áreas logísticas',
        descripcion: 'Plataformas y áreas logísticas: concentración de mercancías y tránsito de vehículos pesados.',
        categoria: 'tematica', grupo: 'Riesgo tecnológico e industrial',
        wmsUrl: 'https://www.ideandalucia.es/services/DERA_g8_tejido_economico/wms',
        wmsLayers: 'g08_02_AreaLogistica',
        wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IECA · DERA',
        opacidad: 0.65, visiblePorDefecto: false, orden: 61,
    },

    // ── Geología y riesgos naturales ────────────────────────────────────────
    {
        clave: 'geologico-magna',
        nombre: 'Mapa geológico (MAGNA 1:50.000)',
        descripcion: 'Cartografía geológica MAGNA 1:50.000 del IGME: litología y estructura del terreno. Base geotécnica del PTEL.',
        categoria: 'tematica', grupo: 'Geología y riesgos naturales',
        wmsUrl: 'https://mapas.igme.es/gis/services/Cartografia_Geologica/IGME_MAGNA_50/MapServer/WMSServer',
        wmsLayers: '0',
        wmsVersion: '1.3.0', wmsFormat: 'image/png', transparente: true,
        atribucion: '© IGME · MAGNA 1:50.000',
        opacidad: 0.6, visiblePorDefecto: false, orden: 70,
    },
    {
        clave: 'peligrosidad-sismica',
        nombre: 'Peligrosidad sísmica',
        descripcion: 'Intensidad sísmica esperada para un periodo de retorno de 475 años (norma NCSE). Riesgo sísmico del PTEL.',
        categoria: 'tematica', grupo: 'Geología y riesgos naturales',
        wmsUrl: 'https://www.ign.es/wms-inspire/geofisica',
        wmsLayers: 'HazardArea2015.Int475',
        wmsVersion: '1.3.0', wmsFormat: 'image/png', transparente: true,
        atribucion: '© Instituto Geográfico Nacional',
        opacidad: 0.5, visiblePorDefecto: false, orden: 71,
    },

    // ── Infraestructura energética (DERA g10, vectorial local recortado a la
    //    zona de Bormujos). Riesgo tecnológico y recurso a la vez. ────────────
    {
        clave: 'lineas-electricas',
        nombre: 'Líneas eléctricas',
        descripcion: 'Tendido eléctrico de alta y media tensión. Riesgo por caída/contacto e infraestructura crítica a proteger.',
        categoria: 'tematica', grupo: 'Infraestructura energética',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/energia-lineas-electricas.geojson', color: '#dc2626',
        atribucion: '© IECA · DERA', opacidad: 0.9, visiblePorDefecto: false, orden: 62,
    },
    {
        clave: 'subestaciones',
        nombre: 'Subestaciones eléctricas',
        descripcion: 'Subestaciones de transformación. Nudos críticos de la red eléctrica.',
        categoria: 'tematica', grupo: 'Infraestructura energética',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/energia-subestaciones.geojson', color: '#b91c1c',
        atribucion: '© IECA · DERA', opacidad: 1, visiblePorDefecto: false, orden: 63,
    },
    {
        clave: 'gasoductos',
        nombre: 'Gasoductos',
        descripcion: 'Conducciones de gas. Riesgo tecnológico por fuga/explosión; condiciona intervención y evacuación.',
        categoria: 'tematica', grupo: 'Infraestructura energética',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/energia-gasoductos.geojson', color: '#f59e0b',
        atribucion: '© IECA · DERA', opacidad: 0.95, visiblePorDefecto: false, orden: 64,
    },
    {
        clave: 'oleoductos',
        nombre: 'Oleoductos',
        descripcion: 'Conducciones de productos petrolíferos. Riesgo tecnológico por fuga/incendio.',
        categoria: 'tematica', grupo: 'Infraestructura energética',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/energia-oleoductos.geojson', color: '#7c3aed',
        atribucion: '© IECA · DERA', opacidad: 0.95, visiblePorDefecto: false, orden: 65,
    },

    // ── Riesgo de inundación (SNCZI 2º ciclo 2024, cuenca del Guadalquivir,
    //    recortado al entorno de Bormujos). El riesgo natural principal. ───────
    {
        clave: 'inundable-flujo-preferente',
        nombre: 'Zona de flujo preferente',
        descripcion: 'Vía de intenso desagüe donde el agua circula con más fuerza. Máxima peligrosidad: evitar como zona de intervención o concentración.',
        categoria: 'tematica', grupo: 'Riesgo de inundación',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/inundable-flujo-preferente.geojson', color: '#1e3a8a',
        atribucion: '© SNCZI · MITECO', opacidad: 0.6, visiblePorDefecto: false, orden: 66,
    },
    {
        clave: 'inundable-t100',
        nombre: 'Zona inundable T=100 años',
        descripcion: 'Zona inundable de probabilidad media (periodo de retorno 100 años). Referencia para ordenación y protección civil.',
        categoria: 'tematica', grupo: 'Riesgo de inundación',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/inundable-t100.geojson', color: '#2563eb',
        atribucion: '© SNCZI · MITECO', opacidad: 0.5, visiblePorDefecto: false, orden: 67,
    },
    {
        clave: 'inundable-t500',
        nombre: 'Zona inundable T=500 años',
        descripcion: 'Zona inundable de probabilidad baja (periodo de retorno 500 años). Extensión máxima de la avenida.',
        categoria: 'tematica', grupo: 'Riesgo de inundación',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/inundable-t500.geojson', color: '#60a5fa',
        atribucion: '© SNCZI · MITECO', opacidad: 0.45, visiblePorDefecto: false, orden: 68,
    },
    {
        clave: 'inundable-t10',
        nombre: 'Zona inundable T=10 años',
        descripcion: 'Zona inundable de alta probabilidad (periodo de retorno 10 años): la que se anega con más frecuencia.',
        categoria: 'tematica', grupo: 'Riesgo de inundación',
        wmsUrl: '', wmsLayers: '', wmsVersion: '1.1.1', wmsFormat: 'image/png', transparente: true,
        geojsonUrl: '/cartografia/inundable-t10.geojson', color: '#1e40af',
        atribucion: '© SNCZI · MITECO', opacidad: 0.6, visiblePorDefecto: false, orden: 69,
    },
]

export const TODAS_LAS_CAPAS_OFICIALES = [...CAPAS_BASE, ...CAPAS_TEMATICAS]

/** Orden en que se muestran las secciones del panel de capas. */
export const ORDEN_GRUPOS = [
    'Territorio', 'Relieve', 'Hidrografía', 'Riesgo de inundación', 'Viario y accesos',
    'Usos del suelo', 'Población y vulnerables', 'Medios y equipamientos',
    'Riesgo tecnológico e industrial', 'Infraestructura energética',
    'Geología y riesgos naturales', 'Otras',
]

/** Teselas del callejero de fondo (no es WMS). */
export const TILES_CALLEJERO = {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}

// ── Tipos y utilidades de planes ────────────────────────────────────────────

export type TipoPlan = 'ptel' | 'edificio' | 'evento'

export const TIPOS_PLAN: Record<TipoPlan, {
    label: string; sigla: string; singular: string; descripcion: string
}> = {
    ptel: {
        label: 'PTEL',
        sigla: 'PTEL',
        singular: 'Plan Territorial',
        descripcion: 'Plan Territorial de Emergencias Local: el marco general de respuesta del municipio.',
    },
    edificio: {
        label: 'Planes de Autoprotección',
        sigla: 'PA',
        singular: 'Plan de Autoprotección',
        descripcion: 'Autoprotección de colegios, polideportivos, centros culturales y demás edificios municipales.',
    },
    evento: {
        label: 'Planes de Autoprotección Específicos',
        sigla: 'PAE',
        singular: 'Plan de Autoprotección Específico',
        descripcion: 'Dispositivos para eventos puntuales: Feria, Cabalgata, romerías y actos multitudinarios.',
    },
}

// ── Directorio y catálogo de medios ─────────────────────────────────────────

/** Agrupación del directorio de contactos de un plan. */
export const CATEGORIAS_CONTACTO = [
    { valor: 'direccion',  label: 'Dirección del plan', color: 'violet' },
    { valor: 'operativos', label: 'Servicios operativos', color: 'blue' },
    { valor: 'sanitarios', label: 'Servicios sanitarios', color: 'red' },
    { valor: 'suministros', label: 'Suministros y servicios', color: 'amber' },
    { valor: 'otros',      label: 'Otros contactos', color: 'slate' },
] as const

export const CLASES_CATEGORIA: Record<string, string> = {
    direccion:   'bg-violet-50 text-violet-700 border-violet-200',
    operativos:  'bg-blue-50 text-blue-700 border-blue-200',
    sanitarios:  'bg-red-50 text-red-700 border-red-200',
    suministros: 'bg-amber-50 text-amber-700 border-amber-200',
    otros:       'bg-slate-100 text-slate-600 border-slate-200',
}

/** Tipos de medio del catálogo de recursos. */
export const TIPOS_RECURSO = [
    { valor: 'humano',      label: 'Personal',      icono: 'Users' },
    { valor: 'vehiculo',    label: 'Vehículos',     icono: 'Truck' },
    { valor: 'material',    label: 'Material',      icono: 'Package' },
    { valor: 'instalacion', label: 'Instalaciones', icono: 'Building2' },
    { valor: 'otro',        label: 'Otros',         icono: 'Boxes' },
] as const

export const CLASES_RECURSO: Record<string, string> = {
    humano:      'bg-blue-50 text-blue-700 border-blue-200',
    vehiculo:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    material:    'bg-amber-50 text-amber-700 border-amber-200',
    instalacion: 'bg-violet-50 text-violet-700 border-violet-200',
    otro:        'bg-slate-100 text-slate-600 border-slate-200',
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
