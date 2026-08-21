// Casetas de la Feria de Bormujos 2026, extraídas del Plan de Autoprotección
// (PAE Feria Bormujos 2026, tabla de la sección 3.1). El "aforo" es la capacidad
// de pie (columna "De pie"), que sirve de referencia para el aforo autorizado.
// El aforo autorizado real es el más restrictivo que permitan las salidas.

export interface CasetaFeria {
    id: string        // ID de caseta (nº de caseta)
    nombre: string
    calle: string
    modulos: number
    superficie: number // m²
    aforo: number      // capacidad de pie
}

export const CASETAS_FERIA: CasetaFeria[] = [
    { id: 'TOR-01', nombre: 'Municipal', calle: 'Toro de El Rancho', modulos: 6, superficie: 800, aforo: 1600 },
    { id: 'PSV-01', nombre: 'Peña Sevillista', calle: 'Toro de El Rancho', modulos: 3, superficie: 180, aforo: 360 },
    { id: 'CUR-01', nombre: 'Coro Parroquial', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-02', nombre: 'Reoma', calle: 'Currillo de Bormujos', modulos: 3, superficie: 180, aforo: 360 },
    { id: 'CUR-03', nombre: 'El Rancho', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-04', nombre: 'La Maja Desnúa', calle: 'Currillo de Bormujos', modulos: 1, superficie: 60, aforo: 120 },
    { id: 'CUR-05', nombre: 'Las Niñas', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-06', nombre: 'Surfasaurus', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-07', nombre: 'PSOE', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-08', nombre: 'Los Elegidos', calle: 'Currillo de Bormujos', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'CUR-09', nombre: 'Jaleo Fino', calle: 'Currillo de Bormujos', modulos: 1, superficie: 60, aforo: 120 },
    { id: 'CUR-10', nombre: 'Los 7', calle: 'Currillo de Bormujos', modulos: 3, superficie: 180, aforo: 360 },
    { id: 'BUL-01', nombre: 'Amantes de lo Ajeno', calle: 'Bulerías', modulos: 3, superficie: 180, aforo: 360 },
    { id: 'BUL-02', nombre: 'Los Mascas', calle: 'Bulerías', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'BUL-03', nombre: 'Glorieta Racing', calle: 'Bulerías', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'PBE-01', nombre: 'Peña Bética', calle: 'Sevillanas', modulos: 4, superficie: 240, aforo: 480 },
    { id: 'SEV-01', nombre: 'Hasta que llegó el momento', calle: 'Sevillanas', modulos: 1, superficie: 60, aforo: 120 },
    { id: 'SEV-02', nombre: 'La Oficina', calle: 'Sevillanas', modulos: 1, superficie: 60, aforo: 120 },
    { id: 'SEV-03', nombre: 'Los Niños', calle: 'Sevillanas', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'SEV-04', nombre: 'Paraíso natural', calle: 'Sevillanas', modulos: 2, superficie: 120, aforo: 240 },
    { id: 'SEV-05', nombre: 'Hdad. Rocío', calle: 'Sevillanas', modulos: 3, superficie: 180, aforo: 360 },
]

// Referencias de evacuación del plan (para orientar el relleno de la sección 08).
export const EVACUACION_REF = {
    pasilloServicioM: 3,     // pasillo de servicio del perímetro
    distanciaMaxExtintorM: 15, // recorrido máximo hasta un extintor
}
