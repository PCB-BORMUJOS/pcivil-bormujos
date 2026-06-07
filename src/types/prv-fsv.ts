// ─── Estado del formulario ────────────────────────────────────────────────────

export type PrvFsvFormState = {
    id?: string
    numeroReferencia?: string
    fecha: string   // YYYY-MM-DD
    hora: string    // HH:MM
    km: string      // string para el input
    // Campos del formulario PDF (campo nombre → valor)
    camposFormulario: Record<string, string | boolean>
    // Fotos
    fotoFrontal: string | null
    fotoTrasera: string | null
    fotoLateralIzq: string | null
    fotoLateralDer: string | null
    estado: string
}

export const INITIAL_PRV_FSV_STATE: PrvFsvFormState = {
    fecha: '',
    hora: '',
    km: '',
    camposFormulario: {},
    fotoFrontal: null,
    fotoTrasera: null,
    fotoLateralIzq: null,
    fotoLateralDer: null,
    estado: 'borrador',
}
