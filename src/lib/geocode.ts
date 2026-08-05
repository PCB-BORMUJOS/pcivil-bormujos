/**
 * Geocodificación de direcciones con Nominatim (OpenStreetMap, sin API key).
 * Se usa para obtener las coordenadas de una incidencia de CECOPAL y poder
 * lanzar la navegación en los iPads de los vehículos.
 *
 * Nominatim exige un User-Agent identificativo y limita la frecuencia de uso;
 * como solo se llama al crear/editar una incidencia, encaja dentro de su
 * política de uso razonable.
 */
export async function geocodificarDireccion(
    direccion: string
): Promise<{ lat: number; lng: number } | null> {
    const q = (direccion || '').trim()
    if (!q || q === '-') return null

    // Sesgar el resultado hacia el ámbito local.
    const consulta = /bormujos|sevilla|españa|espana/i.test(q) ? q : `${q}, Bormujos, Sevilla, España`

    try {
        const url =
            'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=' +
            encodeURIComponent(consulta)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)
        const res = await fetch(url, {
            headers: { 'User-Agent': 'ProteccionCivilBormujos/1.0 (info.pcivil@bormujos.net)' },
            signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!res.ok) return null
        const data = (await res.json()) as Array<{ lat: string; lon: string }>
        if (!Array.isArray(data) || data.length === 0) return null
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null
        return { lat, lng }
    } catch {
        // Fallo de red / timeout: la incidencia se crea igualmente sin coordenadas
        // y la navegación usará el texto de la dirección como destino.
        return null
    }
}
