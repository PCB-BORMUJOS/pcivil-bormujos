import { getTodaySpain } from '@/lib/date-utils'

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type ChecklistItem = {
    item: string
    valor: number // 1-5
}

export type MaterialItem = {
    item: string
    grupo: string
    valor: number // 1-5
}

export type DanoDiagrama = {
    x: number // % respecto al ancho del SVG
    y: number // % respecto al alto del SVG
    descripcion: string
}

export type FotoSlot = {
    label: string
    field: keyof Pick<PrvFsvFormState,
        'fotoFrontal' | 'fotoTrasera' | 'fotoLateralIzq' | 'fotoLateralDer' |
        'fotoDetalle1' | 'fotoDetalle2' | 'fotoDetalle3' | 'fotoDetalle4'>
}

// ─── Estado del formulario ────────────────────────────────────────────────────

export type PrvFsvFormState = {
    id?: string
    numeroReferencia?: string

    fecha: string   // YYYY-MM-DD
    hora: string    // HH:MM
    km: string      // string para el input, se convierte a Int en API

    checklistPrincipal: ChecklistItem[]
    danosDiagrama: DanoDiagrama[]

    nivelDiesel: string
    tieneDiesel: boolean
    nivelAceite: string
    nivelAgua: string
    nivelLimpiaparabrisas: string

    observaciones: string
    indicativo1: string
    indicativo2: string
    indicativo3: string
    firmaJefeServicio: string | null

    checklistMaterial: MaterialItem[]

    fotoFrontal: string | null
    fotoTrasera: string | null
    fotoLateralIzq: string | null
    fotoLateralDer: string | null
    fotoDetalle1: string | null
    fotoDetalle2: string | null
    fotoDetalle3: string | null
    fotoDetalle4: string | null

    estado: string
}

// ─── Ítems del checklist principal (Tab 1) ────────────────────────────────────

export const CHECKLIST_PRINCIPAL: string[] = [
    'LIMPIEZA EXTERIOR',
    'LIMPIEZA INTERIOR',
    'ESTADO DE LOS NEUMÁTICOS',
    'LUCES DE POSICIÓN / CRUCE / LARGA',
    'LUCES INTERIOR HABITÁCULO',
    'LUCES DE EMERGENCIA',
    'PUENTE DE LUCES PRIORITARIAS',
    'LUCES PRIORITARIAS PERIMETRALES',
    'SIRENAS',
    'MEGAFONÍA',
    'CLIMATIZACIÓN',
    'CLÁXON',
    'CABLE DISPOSITIVO CARGA',
    'PINZAS DE ARRANQUE',
    'BOTIQUÍN PEQUEÑO',
    'DESA',
    'MALETA DE LUCES DE SEÑALIZACIÓN',
    '5 LINTERNAS CON CONO',
]

// ─── Ítems del checklist de material (Tab 2) ─────────────────────────────────

export const CHECKLIST_MATERIAL: Array<{ grupo: string; items: string[] }> = [
    {
        grupo: 'Material especial',
        items: [
            'PAR DE GUANTES ALTA TENSIÓN',
            'BOLSAS DE BRIDAS',
            'MANTA CORTAFUEGO',
            'MACHOTA',
            'CORTAFRIO',
            'SÁBANAS',
            'TOALLA',
            'INFLADOR DE COLCHÓN DE VACÍO',
        ],
    },
    {
        grupo: 'Hidrantes',
        items: [
            'LLAVES DE TAPA DE HIDRANTE',
            'MANGUERAS DE 5"',
            'RACOR DE 45 A 45',
            'RACOR DE 45 A 70',
            'RACOR DE 70 A 70',
            'BIFURCACIÓN',
            'LLAVE GRANDE DE HIDRANTE',
            'CODO GRANDE DE HIDRANTE',
        ],
    },
    {
        grupo: 'Extinción forestal',
        items: [
            'GARRAFA GASOLINA MOTOSIERRA',
            'MANGUERA 5"',
            'GARRAFA DE SEPIOLITA',
            'GARRAFA DE ESPUMÓGENO',
            'PALAS',
            'PALANQUETA',
            'AZADA',
            'MOTOSIERRA',
            'MAZA',
            'CEPILLO PEQUEÑO LIMPIEZA',
            'PUNTA DE LANZA',
        ],
    },
    {
        grupo: 'Acceso y escalada',
        items: [
            'ESCALERA DE ALUMINIO',
            'BATEFUEGO',
            'CEPILLOS DE LIMPIEZA',
            'BICHEROS GRANDES',
            'ESCALERA EXTENSIBLE',
            'MOCHILAS PULVERIZADORAS',
            'CONOS',
            'DEVANADERA',
        ],
    },
    {
        grupo: 'Sanitario y rescate',
        items: [
            'MED',
            'COLLARÍN',
            'FÉRULA DE INMOVILIZACIÓN',
            'BALA DE OXÍGENO',
            'FOCO CON TRÍPODE',
            'EXTINTOR DE POLVO',
            'EXTINTOR DE CO2',
            'COLCHÓN DE VACÍO',
            'CAMILLA DE TIJERA',
        ],
    },
    {
        grupo: 'Herramientas y amarre',
        items: [
            'CALZOS',
            'BOLSA DE HERRAMIENTAS',
            'KIT CORREAS/CINTAS INMOVILIZACIÓN',
            'CINTAS BALIZAMIENTO/CARROCERA',
            'PULPOS',
            'CUERDA',
            'TRINQUETES',
            'CINCHAS',
            'BOLSAS DE BASURA',
        ],
    },
]

// ─── Slots de fotos ───────────────────────────────────────────────────────────

export const FOTO_SLOTS_TAB3: FotoSlot[] = [
    { label: 'VISTA FRONTAL',     field: 'fotoFrontal'    },
    { label: 'VISTA TRASERA',     field: 'fotoTrasera'    },
    { label: 'LATERAL IZQUIERDO', field: 'fotoLateralIzq' },
    { label: 'LATERAL DERECHO',   field: 'fotoLateralDer' },
]

export const FOTO_SLOTS_TAB4: FotoSlot[] = [
    { label: 'DETALLE 1', field: 'fotoDetalle1' },
    { label: 'DETALLE 2', field: 'fotoDetalle2' },
    { label: 'DETALLE 3', field: 'fotoDetalle3' },
    { label: 'DETALLE 4', field: 'fotoDetalle4' },
]

// ─── Opciones de niveles ──────────────────────────────────────────────────────

export const NIVELES_DIESEL = ['0/0', '1/4', '1/2', '3/4', '4/4']
export const NIVELES_OTROS  = ['0/0', '1/2', '4/4']

// ─── Estado inicial ───────────────────────────────────────────────────────────

export const INITIAL_PRV_FSV_STATE: PrvFsvFormState = {
    fecha: getTodaySpain(),
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }),
    km: '',

    checklistPrincipal: CHECKLIST_PRINCIPAL.map(item => ({ item, valor: 1 })),
    danosDiagrama: [],

    nivelDiesel: '4/4',
    tieneDiesel: true,
    nivelAceite: '4/4',
    nivelAgua: '4/4',
    nivelLimpiaparabrisas: '4/4',

    observaciones: '',
    indicativo1: '',
    indicativo2: '',
    indicativo3: '',
    firmaJefeServicio: null,

    checklistMaterial: CHECKLIST_MATERIAL.flatMap(g =>
        g.items.map(item => ({ item, grupo: g.grupo, valor: 1 }))
    ),

    fotoFrontal: null,
    fotoTrasera: null,
    fotoLateralIzq: null,
    fotoLateralDer: null,
    fotoDetalle1: null,
    fotoDetalle2: null,
    fotoDetalle3: null,
    fotoDetalle4: null,

    estado: 'borrador',
}
