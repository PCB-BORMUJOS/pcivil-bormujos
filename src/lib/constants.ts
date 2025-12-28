// Constantes y datos mock migrados desde Google AI Studio

import { 
  ServiceArea, 
  VehicleStatus, 
  VehicleType, 
  EventType, 
  UrgencyLevel,
  OperationalRole 
} from '@/types/ai-studio';

// Navigation Items para el Sidebar
export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/dashboard' },
  { id: 'shifts', label: 'Cuadrantes', icon: 'CalendarDays', href: '/cuadrantes' },
  { id: 'admin', label: 'Mi Área / FRI', icon: 'Users', href: '/mi-area' },
  { id: 'logistics', label: 'Logística', icon: 'Package', href: '/logistica' },
  { id: 'fire', label: 'Incendios', icon: 'Flame', href: '/incendios' },
  { id: 'lifeguard', label: 'Socorrismo', icon: 'HeartPulse', href: '/socorrismo' },
  { id: 'vehicles', label: 'Vehículos', icon: 'Ambulance', href: '/vehiculos' },
  { id: 'comms', label: 'Transmisiones', icon: 'Radio', href: '/transmisiones' },
  { id: 'pma', label: 'PMA', icon: 'Tent', href: '/pma' },
  { id: 'settings', label: 'Configuración', icon: 'Settings', href: '/configuracion' },
];

// Datos Mock de Voluntarios
export const MOCK_VOLUNTEERS = [
  {
    id: 'j44',
    name: 'EMILIO',
    surname: 'SIMÓN GÓMEZ',
    email: 'emilio.simon@pcbormujos.es',
    badgeNumber: 'J-44',
    rank: 'Jefe de Servicio',
    systemRole: 'superadmin' as const,
    operationalRole: OperationalRole.JEFE_SERVICIO,
    area: 'JEFATURA',
    status: 'Activo',
    avatarUrl: 'https://ui-avatars.com/api/?name=EMILIO+SIMON&background=ea580c&color=fff',
    municipio: 'Bormujos',
    kmAllowance: 0,
    capabilities: { canLead: true, canDrive: true, experience: 'ALTA' as const }
  },
  {
    id: 's01',
    name: 'TANYA',
    surname: 'GONZÁLEZ MEDINA',
    email: 'tanya@pcbormujos.es',
    badgeNumber: 'S-01',
    rank: 'Coordinador Socorrismo',
    systemRole: null,
    operationalRole: OperationalRole.INDICATIVO,
    area: 'SOCORRISMO',
    status: 'Activo',
    avatarUrl: 'https://ui-avatars.com/api/?name=TANYA+GONZALEZ&background=0ea5e9&color=fff',
    municipio: 'Mairena del Aljarafe',
    kmAllowance: 5.25,
    capabilities: { canLead: true, canDrive: true, experience: 'ALTA' as const }
  },
  {
    id: 'b29',
    name: 'JOSE CARLOS',
    surname: 'BAILÓN LÓPEZ',
    email: 'jose@pcbormujos.es',
    badgeNumber: 'B-29',
    rank: 'Responsable Logística',
    systemRole: null,
    operationalRole: OperationalRole.INDICATIVO,
    area: 'LOGÍSTICA',
    status: 'Activo',
    avatarUrl: 'https://ui-avatars.com/api/?name=JOSE+BAILON&background=22c55e&color=fff',
    municipio: 'Tomares',
    kmAllowance: 3.50,
    capabilities: { canLead: true, canDrive: true, experience: 'ALTA' as const }
  },
  {
    id: 's02',
    name: 'ANA MARÍA',
    surname: 'FERNÁNDEZ PÉREZ',
    email: 'ana@pcbormujos.es',
    badgeNumber: 'S-02',
    rank: 'Voluntario',
    systemRole: null,
    operationalRole: OperationalRole.INDICATIVO,
    area: 'SOCORRISMO',
    status: 'Activo',
    avatarUrl: 'https://ui-avatars.com/api/?name=ANA+FERNANDEZ&background=8b5cf6&color=fff',
    municipio: 'Bormujos',
    kmAllowance: 0,
    capabilities: { canLead: true, canDrive: false, experience: 'ALTA' as const }
  },
];

// Datos Mock de Vehículos
export const MOCK_VEHICLES = [
  { 
    id: 'veh1', 
    code: 'A-01', 
    model: 'Mercedes Sprinter', 
    plate: '1234-KBC', 
    type: VehicleType.AMBULANCE, 
    status: VehicleStatus.AVAILABLE, 
    lastCheck: '2023-10-20',
    location: { lat: 37.371, lng: -6.072, lastUpdate: '10 min' },
    documents: [],
    maintenanceHistory: []
  },
  { 
    id: 'veh2', 
    code: 'V-02', 
    model: 'Toyota Land Cruiser', 
    plate: '5678-XYZ', 
    type: VehicleType.VIR, 
    status: VehicleStatus.IN_SERVICE, 
    lastCheck: '2023-11-15',
    location: { lat: 37.373, lng: -6.068, lastUpdate: '5 min' },
    documents: [],
    maintenanceHistory: []
  },
];

// Datos Mock de Inventario
export const MOCK_INVENTORY = [
  { 
    id: 'i1', 
    name: 'Gasas Estériles 20x20', 
    family: 'Sanitario', 
    subfamily: 'Curas', 
    quantity: 500, 
    minStock: 100, 
    unit: 'u', 
    entryDate: '2023-09-01', 
    expiryDate: '2026-09-01', 
    location: 'Almacén 1 - A2', 
    area: ServiceArea.LIFEGUARD 
  },
  { 
    id: 'i2', 
    name: 'Guantes Nitrilo M', 
    family: 'EPI', 
    subfamily: 'Protección', 
    quantity: 200, 
    minStock: 50, 
    unit: 'pares', 
    entryDate: '2023-08-15', 
    expiryDate: '2025-08-15', 
    location: 'Almacén 1 - B1', 
    area: ServiceArea.LIFEGUARD 
  },
  { 
    id: 'i3', 
    name: 'Extintor CO2 5kg', 
    family: 'Extinción', 
    subfamily: 'Portátil', 
    quantity: 12, 
    minStock: 5, 
    unit: 'u', 
    entryDate: '2023-01-01', 
    expiryDate: '2028-01-01', 
    location: 'Almacén 2 - C1', 
    area: ServiceArea.FIRE 
  },
];

// Datos Mock de Eventos
export const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'Feria de Bormujos - Turno Tarde',
    description: 'Dispositivo preventivo sanitario y seguridad para la feria local.',
    date: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '22:00',
    location: 'Recinto Ferial',
    type: EventType.PREVENTIVE,
    assignedPersonnel: ['s01', 's05'],
    assignedVehicles: ['veh2'],
    urgency: UrgencyLevel.MEDIUM
  },
  {
    id: 'e2',
    title: 'Formación RCP/DEA',
    description: 'Sesión de reciclaje en técnicas de reanimación.',
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '14:00',
    location: 'Base Protección Civil',
    type: EventType.TRAINING,
    assignedPersonnel: [],
    assignedVehicles: [],
    urgency: UrgencyLevel.LOW
  }
];

// Datos Mock de Hidrantes
export const MOCK_HYDRANTS = [
  {
    id: 'h1',
    code: 'H-001',
    address: 'Calle Real, 12',
    lat: 37.371,
    lng: -6.071,
    type: 'Columna' as const,
    status: 'Operativo' as const,
    lastRevision: '2023-05-10',
    nextRevision: '2024-05-10',
    pressure: 4.5
  },
  {
    id: 'h2',
    code: 'H-002',
    address: 'Avda. de Andalucía, 45',
    lat: 37.369,
    lng: -6.074,
    type: 'Arqueta' as const,
    status: 'Operativo' as const,
    lastRevision: '2023-06-15',
    nextRevision: '2024-06-15',
    pressure: 4.2
  },
];

// Datos Mock de Planos de Edificios
export const MOCK_BUILDING_PLANS = [
  {
    id: 'p1',
    buildingName: 'Ayuntamiento de Bormujos',
    address: 'Plaza de la Iglesia, 1',
    uploadDate: '2023-01-15',
    fileName: 'plan_ayto_2023.pdf',
    description: 'Plano completo de planta baja y primera planta con salidas de emergencia.'
  },
  {
    id: 'p2',
    buildingName: 'Pabellón Municipal',
    address: 'Calle Deportes, s/n',
    uploadDate: '2023-03-20',
    fileName: 'plan_pabellon_2023.pdf',
    description: 'Plano de evacuación y ubicación de extintores.'
  },
];

// Días de la semana
export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Colores por estado de vehículo
export const VEHICLE_STATUS_COLORS = {
  [VehicleStatus.AVAILABLE]: 'bg-green-100 text-green-700 border-green-200',
  [VehicleStatus.IN_SERVICE]: 'bg-orange-100 text-orange-700 border-orange-200',
  [VehicleStatus.MAINTENANCE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [VehicleStatus.OUT_OF_ORDER]: 'bg-red-100 text-red-700 border-red-200',
};

// Colores por tipo de evento
export const EVENT_TYPE_COLORS = {
  [EventType.EMERGENCY]: 'bg-red-100 text-red-800 border-red-200',
  [EventType.PREVENTIVE]: 'bg-blue-100 text-blue-800 border-blue-200',
  [EventType.TRAINING]: 'bg-green-100 text-green-800 border-green-200',
  [EventType.MEETING]: 'bg-purple-100 text-purple-800 border-purple-200',
  [EventType.MAINTENANCE]: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Reglas de dietas por defecto
export const DEFAULT_DIET_RULES = [
  { id: 'd1', minHours: 4, amount: 29, label: 'Tramo > 4h' },
  { id: 'd2', minHours: 8, amount: 45, label: 'Tramo > 8h' },
  { id: 'd3', minHours: 12, amount: 65, label: 'Tramo > 12h' }
];
