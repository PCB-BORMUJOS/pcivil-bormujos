/**
 * Catálogo de iconos predefinidos del servicio para colocar como marcadores
 * en los mapas. Los SVG viven en /public/iconos-mapa/. La API los siembra en
 * la tabla IconoMapa la primera vez que se consultan (esPredefinido = true).
 */
export interface IconoPredefinido {
    slug: string
    nombre: string
    categoria: string
}

export const ICONOS_PREDEFINIDOS: IconoPredefinido[] = [
    { slug: 'bomberos', nombre: 'Bomberos / incendio', categoria: 'Emergencias' },
    { slug: 'sanitario', nombre: 'Punto sanitario', categoria: 'Sanitario' },
    { slug: 'primeros-auxilios', nombre: 'Primeros auxilios', categoria: 'Sanitario' },
    { slug: 'punto-encuentro', nombre: 'Punto de encuentro', categoria: 'Evacuación' },
    { slug: 'evacuacion', nombre: 'Vía de evacuación', categoria: 'Evacuación' },
    { slug: 'zona-segura', nombre: 'Zona segura', categoria: 'Evacuación' },
    { slug: 'hidrante', nombre: 'Hidrante', categoria: 'Recursos' },
    { slug: 'punto-agua', nombre: 'Punto de agua', categoria: 'Recursos' },
    { slug: 'peligro', nombre: 'Peligro', categoria: 'Señalización' },
    { slug: 'corte-calle', nombre: 'Corte de calle', categoria: 'Señalización' },
    { slug: 'parking', nombre: 'Estacionamiento', categoria: 'Señalización' },
    { slug: 'cecopal', nombre: 'CECOPAL / puesto de mando', categoria: 'Mando' },
    { slug: 'policia', nombre: 'Policía / seguridad', categoria: 'Mando' },
    { slug: 'escenario', nombre: 'Escenario / evento', categoria: 'Eventos' },
    { slug: 'extintor', nombre: 'Extintor', categoria: 'Recursos' },
]

export function urlIconoPredefinido(slug: string): string {
    return `/iconos-mapa/${slug}.svg`
}
