/**
 * Compresión de fotografías antes de subirlas al parte.
 *
 * Una foto de iPad ronda los 3–5 MB y en el documento se ve a unos 90 mm de
 * ancho: subirla tal cual desperdicia almacenamiento y hace lentos los partes.
 * Aquí se reescala al ancho máximo necesario y se recomprime a JPEG, que para
 * fotografía pesa mucho menos que PNG sin pérdida apreciable a este tamaño.
 *
 * Se conserva la orientación porque createImageBitmap ya aplica el EXIF.
 */

export type OpcionesCompresion = {
    /** Lado mayor máximo en píxeles. 1600 basta de sobra para impresión a 4:3. */
    ladoMaximo?: number
    /** Calidad JPEG (0-1). 0,72 es el punto donde deja de notarse la pérdida. */
    calidad?: number
}

export type ResultadoCompresion = {
    archivo: File
    bytesOriginales: number
    bytesFinales: number
    /** Porcentaje de reducción, para poder informar al usuario. */
    reduccion: number
}

export async function comprimirImagen(
    original: File,
    { ladoMaximo = 1600, calidad = 0.72 }: OpcionesCompresion = {},
): Promise<ResultadoCompresion> {
    // Si no es una imagen, se devuelve intacta: nunca se corrompe un fichero.
    if (!original.type.startsWith('image/')) {
        return { archivo: original, bytesOriginales: original.size, bytesFinales: original.size, reduccion: 0 }
    }

    try {
        const bitmap = await createImageBitmap(original)
        const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
        const ancho = Math.round(bitmap.width * escala)
        const alto = Math.round(bitmap.height * escala)

        const lienzo = document.createElement('canvas')
        lienzo.width = ancho
        lienzo.height = alto
        const ctx = lienzo.getContext('2d')
        if (!ctx) throw new Error('sin contexto de dibujo')
        ctx.drawImage(bitmap, 0, 0, ancho, alto)
        bitmap.close?.()

        const blob: Blob | null = await new Promise(r => lienzo.toBlob(r, 'image/jpeg', calidad))
        if (!blob) throw new Error('no se pudo comprimir')

        // Si comprimir no mejora (imágenes ya muy pequeñas), se deja la original.
        if (blob.size >= original.size) {
            return { archivo: original, bytesOriginales: original.size, bytesFinales: original.size, reduccion: 0 }
        }

        const nombre = original.name.replace(/\.[^.]+$/, '') + '.jpg'
        return {
            archivo: new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() }),
            bytesOriginales: original.size,
            bytesFinales: blob.size,
            reduccion: Math.round((1 - blob.size / original.size) * 100),
        }
    } catch {
        // Ante cualquier fallo se sube la original: mejor pesada que perdida.
        return { archivo: original, bytesOriginales: original.size, bytesFinales: original.size, reduccion: 0 }
    }
}

export function pesoLegible(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}
