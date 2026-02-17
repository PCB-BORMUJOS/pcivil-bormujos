export const TIPOLOGIAS_PSI = {
    grupo1: [
        { id: 'mantenimiento', label: 'Mantenimiento', numero: '1' },
        { id: 'practicas', label: 'Prácticas', numero: '2' },
        { id: 'suministros', label: 'Suministros', numero: '3' },
        { id: 'preventivo', label: 'Preventivo', numero: '4' },
        { id: 'otros_grupo1', label: 'Otros', numero: '5', tieneTexto: true }
    ],
    grupo2: [
        { id: 'soporte_vital', label: 'Soporte Vital', numero: '1' },
        { id: 'incendios', label: 'Incendios', numero: '2' },
        { id: 'inundaciones', label: 'Inundaciones', numero: '3' },
        { id: 'riesgos_meteo', label: 'Otros Riesgos Meteo', numero: '4' },
        { id: 'pem_bor', label: 'Activación PEM-BOR', numero: '5' },
        { id: 'otros_grupo2', label: 'Otros', numero: '6', tieneTexto: true }
    ],
    grupo3: [
        { id: 'reunion_coordinacion', label: 'Reunión Coordinación', numero: '1' },
        { id: 'reunion_areas', label: 'Reunión Áreas', numero: '2' },
        { id: 'limpieza', label: 'Limpieza', numero: '3' },
        { id: 'formacion', label: 'Formación', numero: '4' },
        { id: 'otros_grupo3', label: 'Otros', numero: '5', tieneTexto: true }
    ]
} as const

export const CIRCULACION_OPTIONS = [
    { value: 'prevencion', label: 'Prevención' },
    { value: 'intervencion', label: 'Intervención' },
    { value: 'otros', label: 'Otros' }
] as const

export const WALKIES_BASE = [
    'WJ01', 'WFR01',
    'W001', 'W002', 'W003', 'W004', 'W005',
    'W006', 'W007', 'W008', 'W009', 'W010',
    'W011', 'W012', 'W013', 'W014', 'W015',
    'W016', 'W017', 'W018', 'W019', 'W020',
    'W021', 'W022', 'W023', 'W024', 'W025',
    'W026', 'W027', 'W028'
] as const

export const ESTADOS_PARTE = {
    borrador: {
        label: 'Borrador',
        color: 'gray',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300'
    },
    pendiente_vb: {
        label: 'Pendiente VB',
        color: 'yellow',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300'
    },
    completo: {
        label: 'Completo',
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
    }
} as const
