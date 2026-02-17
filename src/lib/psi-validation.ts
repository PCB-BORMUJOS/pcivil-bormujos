/**
 * Validación mínima para guardar como borrador.
 * Solo requiere el campo Lugar para poder crear el parte y obtener un ID,
 * lo que desbloquea la subida de fotos y otras funcionalidades.
 */
export function validarBorradorPSI(data: any): { valido: boolean; errores: string[] } {
    const errores: string[] = []

    if (!data.lugar || data.lugar.trim() === '') {
        errores.push('El campo "Lugar" es obligatorio incluso para borradores')
    }

    return {
        valido: errores.length === 0,
        errores
    }
}

/**
 * Valida que un parte tenga todos los campos obligatorios (para finalización)
 */
export function validarPartePSI(data: any): { valido: boolean; errores: string[] } {
    const errores: string[] = []

    if (!data.lugar || data.lugar.trim() === '') {
        errores.push('El campo "Lugar" es obligatorio')
    }

    if (!data.observaciones || data.observaciones.trim() === '') {
        errores.push('El campo "Observaciones" es obligatorio')
    }

    // Validar indicativo que informa
    if (!data.indicativosInforman) {
        errores.push('Debe seleccionar el indicativo que informa')
    }

    // CORREGIDO: validar con los nombres correctos del formulario
    if (!data.firmaInformante && !data.firmaIndicativoCumplimenta) {
        errores.push('Falta la firma del indicativo que informa')
    }

    // Validar responsable del turno
    if (!data.responsableTurno) {
        errores.push('Debe seleccionar el responsable del turno')
    }

    // CORREGIDO: validar con los nombres correctos del formulario
    if (!data.firmaResponsable && !data.firmaResponsableTurno) {
        errores.push('Falta la firma del responsable del turno')
    }

    // Tipologías
    if (!data.tipologias || data.tipologias.length === 0) {
        errores.push('Debe seleccionar al menos una tipología')
    }

    return {
        valido: errores.length === 0,
        errores
    }
}
