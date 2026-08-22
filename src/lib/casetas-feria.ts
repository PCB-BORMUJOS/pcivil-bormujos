/**
 * Casetas del Recinto Ferial de Bormujos.
 *
 * Transcrito de la tabla de aforos del Plan de Autoprotección de la Feria 2026
 * (apartado 3.1.2.6, páginas 24 y 25). Sirve para rellenar de una vez los datos
 * de la caseta en el parte de revisión, en lugar de teclearlos caseta por
 * caseta con el riesgo de equivocar el aforo.
 *
 * El aforo que se traslada al parte es el OPERATIVO (el 85 % del aforo con
 * mesas), tal como establece el propio plan: «El aforo autorizado de cada
 * caseta es el aforo operativo (columna Operat.), que se traslada al Parte de
 * Revisión de Feria». Así el dato del plan y el del parte son el mismo.
 *
 * Ojo: el aforo autorizado definitivo es el valor más restrictivo que permitan
 * las salidas de evacuación de la caseta. Si al revisarla las salidas no dan
 * para este número, se corrige a la baja en el parte.
 *
 * Corrección sobre el PAE: la tabla del plan sitúa la Peña Sevillista en Toro
 * de El Rancho, pero está en Currillo de Bormujos. Prevalece lo comprobado
 * sobre el terreno; conviene arreglarlo también en el plan.
 */

export type CasetaFeria = {
    /** Identificador del plan (TOR-01, CUR-03…). Va al campo «Nº de caseta». */
    id: string
    nombre: string
    calle: string
    modulos: number
    superficie: number
    /** Aforo con mesas y sillas: 35 personas por módulo de 60 m². */
    aforoMesas: number
    /** Aforo operativo (85 %): el que se autoriza y se lleva al parte. */
    aforoOperativo: number
    /** Aforo máximo de pie, a 0,5 m²/persona. */
    aforoDePie: number
}

export const CASETAS_FERIA: CasetaFeria[] = [
    { id: 'TOR-01', nombre: 'Municipal',                  calle: 'Toro de El Rancho',    modulos: 6, superficie: 800, aforoMesas: 467, aforoOperativo: 397, aforoDePie: 1600 },
    { id: 'PSV-01', nombre: 'Peña Sevillista',            calle: 'Currillo de Bormujos', modulos: 3, superficie: 180, aforoMesas: 105, aforoOperativo: 89,  aforoDePie: 360 },
    { id: 'CUR-01', nombre: 'Coro Parroquial',            calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-02', nombre: 'Reoma',                      calle: 'Currillo de Bormujos', modulos: 3, superficie: 180, aforoMesas: 105, aforoOperativo: 89,  aforoDePie: 360 },
    { id: 'CUR-03', nombre: 'El Rancho',                  calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-04', nombre: 'La Maja Desnúa',             calle: 'Currillo de Bormujos', modulos: 1, superficie: 60,  aforoMesas: 35,  aforoOperativo: 30,  aforoDePie: 120 },
    { id: 'CUR-05', nombre: 'Las Niñas',                  calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-06', nombre: 'Surfasaurus',                calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-07', nombre: 'PSOE',                       calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-08', nombre: 'Los Elegidos',               calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'CUR-09', nombre: 'Jaleo Fino',                 calle: 'Currillo de Bormujos', modulos: 1, superficie: 60,  aforoMesas: 35,  aforoOperativo: 30,  aforoDePie: 120 },
    { id: 'CUR-10', nombre: 'Los 7',                      calle: 'Currillo de Bormujos', modulos: 3, superficie: 180, aforoMesas: 105, aforoOperativo: 89,  aforoDePie: 360 },
    { id: 'BUL-01', nombre: 'Amantes de lo Ajeno',        calle: 'Bulerías',             modulos: 3, superficie: 180, aforoMesas: 105, aforoOperativo: 89,  aforoDePie: 360 },
    { id: 'BUL-02', nombre: 'Los Mascas',                 calle: 'Bulerías',             modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'BUL-03', nombre: 'Glorieta Racing',            calle: 'Bulerías',             modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'PBE-01', nombre: 'Peña Bética',                calle: 'Sevillanas',           modulos: 4, superficie: 240, aforoMesas: 140, aforoOperativo: 119, aforoDePie: 480 },
    { id: 'SEV-01', nombre: 'Hasta que llegó el momento', calle: 'Sevillanas',           modulos: 1, superficie: 60,  aforoMesas: 35,  aforoOperativo: 30,  aforoDePie: 120 },
    { id: 'SEV-02', nombre: 'La Oficina',                 calle: 'Sevillanas',           modulos: 1, superficie: 60,  aforoMesas: 35,  aforoOperativo: 30,  aforoDePie: 120 },
    { id: 'SEV-03', nombre: 'Los Niños',                  calle: 'Sevillanas',           modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'SEV-04', nombre: 'Paraíso natural',            calle: 'Sevillanas',           modulos: 2, superficie: 120, aforoMesas: 70,  aforoOperativo: 60,  aforoDePie: 240 },
    { id: 'SEV-05', nombre: 'Hdad. Rocío',                calle: 'Sevillanas',           modulos: 3, superficie: 180, aforoMesas: 105, aforoOperativo: 89,  aforoDePie: 360 },
]

/** Localidad de todas las casetas del recinto. */
export const LOCALIDAD_FERIA = 'Bormujos'

export function buscarCaseta(nombre: string): CasetaFeria | undefined {
    const n = nombre.trim().toLocaleLowerCase('es')
    if (!n) return undefined
    return CASETAS_FERIA.find(c =>
        c.nombre.toLocaleLowerCase('es') === n || c.id.toLocaleLowerCase('es') === n)
}

/**
 * Datos que el parte toma del plan al elegir una caseta. Todos siguen siendo
 * editables a mano: si la caseta cambia de sitio o de módulos, manda lo que se
 * comprueba sobre el terreno.
 */
export function datosDeCaseta(c: CasetaFeria) {
    const esEstandar = c.modulos >= 1 && c.modulos <= 3
    return {
        nombreCaseta: c.nombre,
        numeroCaseta: c.id,
        calleSector: c.calle,
        localidad: LOCALIDAD_FERIA,
        aforo: String(c.aforoOperativo),
        modulos: (esEstandar ? String(c.modulos) : 'otros') as '' | '1' | '2' | '3' | 'otros',
        modulosOtros: esEstandar ? '' : String(c.superficie),
    }
}

/**
 * Número de expediente de una revisión.
 *
 * Se compone del número de parte y del identificador de la caseta, unidos por
 * guion: 20260822-001 + TOR-01 → 20260822-001-TOR-01. No se teclea a mano, de
 * modo que dos revisiones nunca comparten expediente y el del parte siempre
 * concuerda con la caseta que se está revisando.
 *
 * Mientras falte alguna de las dos piezas —el número de parte no existe hasta
 * el primer guardado— se devuelve lo que haya, para no mostrar guiones sueltos.
 */
export function componerExpediente(numeroParte?: string | null, idCaseta?: string | null): string {
    return [numeroParte, idCaseta].map(v => (v || '').trim()).filter(Boolean).join('-')
}
