// ─── Campos AcroForm del PDF ───────────────────────────────────────────────────

export type FsvField = {
    name: string
    type: 'Btn' | 'Tx' | 'Ch'
    page: number
    rect: [number, number, number, number]  // [x1, y1, x2, y2] PDF user space
    photo?: boolean
}

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
