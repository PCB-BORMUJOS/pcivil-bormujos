/**
 * Valida que un parte tenga todos los campos obligatorios
 * Extracted from partesPSI.ts to be client-safe (no prisma imports)
 */
export function validarPartePSI(data: any): { valido: boolean; errores: string[] } {
    const errores: string[] = []

    if (!data.lugar || data.lugar.trim() === '') {
        errores.push('El campo "Lugar" es obligatorio')
    }

    if (!data.observaciones || data.observaciones.trim() === '') {
        errores.push('El campo "Observaciones" es obligatorio')
    }

    // New logic: checks for Indicativo Informa
    if (!data.indicativosInforman) {
        errores.push('Debe seleccionar el indicativo que informa')
    }

    if (!data.firmaInformante) {
        errores.push('Falta la firma del indicativo que informa')
    }

    if (!data.responsableTurno) {
        errores.push('Debe seleccionar el responsable del turno')
    }

    if (!data.firmaResponsable) {
        errores.push('Falta la firma del responsable del turno')
    }

    // if (!data.vehiculosIds || data.vehiculosIds.length === 0) {
    //     errores.push('Debe seleccionar al menos un vehículo')
    // }

    // if (!data.equipoWalkies || data.equipoWalkies.length === 0) {
    //     errores.push('Debe añadir al menos una combinación de equipo/walkie')
    // }

    // Validacion tipologias: data.tipologias is array of strings
    if (!data.tipologias || data.tipologias.length === 0) {
        errores.push('Debe seleccionar al menos una tipología')
    }

    return {
        valido: errores.length === 0,
        errores
    }
}
