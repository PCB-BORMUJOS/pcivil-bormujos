// Types migrados desde Google AI Studio - Protección Civil Bormujos
// Estos tipos complementan los existentes en types/index.ts

export enum VolunteerStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  ON_LEAVE = 'Baja',
  ON_DUTY = 'En Servicio'
}

export enum UserRole {
  SUPERADMIN = 'Superadministrador',
  ADMIN = 'Administrador de Área',
  USER = 'Voluntario'
}

export type SystemRole = 'admin' | 'superadmin' | null;

export enum OperationalRole {
  JEFE_SERVICIO = 'Jefe de Servicio',
  JEFE_AREA = 'Jefe de Área',
  ADJUNTO_AREA = 'Adjunto Jefe de Área',
  INDICATIVO = 'Indicativo'
}

export enum ServiceArea {
  ADMINISTRATION = 'Administración',
  LOGISTICS = 'Logística',
  FIRE = 'Incendios',
  LIFEGUARD = 'Socorrismo',
  VEHICLES = 'Vehículos',
  COMMS = 'Transmisiones',
  PMA = 'PMA',
  SOCIAL = 'Acción Social',
  TRAINING = 'Formación'
}

export enum VehicleStatus {
  AVAILABLE = 'Disponible',
  MAINTENANCE = 'Mantenimiento',
  IN_SERVICE = 'En Servicio',
  OUT_OF_ORDER = 'Averiado'
}

export enum VehicleType {
  AMBULANCE = 'Ambulancia',
  VIR = 'Vehículo Intervención Rápida',
  LOGISTICS = 'Logística',
  PICKUP = 'Pick-up 4x4',
  MOTORCYCLE = 'Motocicleta'
}

export enum EventType {
  PREVENTIVE = 'Preventivo',
  EMERGENCY = 'Emergencia',
  TRAINING = 'Formación',
  MEETING = 'Reunión',
  MAINTENANCE = 'Mantenimiento'
}

export enum UrgencyLevel {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum NotificationStatus {
  PENDING = 'Pendiente',
  READ = 'Leída',
  ACCEPTED = 'Aceptada',
  REJECTED = 'Rechazada'
}

export enum NotificationType {
  INFO = 'Información',
  ALERT = 'Alerta',
  ORDER = 'Orden',
  REQUEST = 'Solicitud'
}

export enum RequestStatus {
  PENDING = 'Pendiente',
  APPROVED = 'Aprobada / Pedida',
  RECEIVED = 'Recepcionada',
  REJECTED = 'Rechazada'
}

export enum ShiftType {
  MORNING = 'Mañana (09:00 - 14:00)',
  AFTERNOON = 'Tarde (17:00 - 22:00)',
  EXTRA = 'Extra / Especial'
}

export interface ShiftAssignment {
  volunteerId: string;
  roleInShift: 'RESPONSABLE' | 'CONDUCTOR' | 'CECOPAL' | 'APOYO';
}

export interface Shift {
  id: string;
  date: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  description?: string;
  assignments: ShiftAssignment[];
  minRequirements: {
    responsable: number;
    conductor: number;
    cecopal: number;
  };
  isComplete: boolean;
}

export interface VolunteerCapabilities {
  canLead: boolean;
  canDrive: boolean;
  experience: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface VolunteerAvailability {
  id: string;
  volunteerId: string;
  weekRef: string;
  submissionDate: string;
  isNotAvailable: boolean;
  details: Record<string, string[]>;
  desiredShifts: number;
  canDoubleShift: boolean;
  comments?: string;
}

export interface ServiceEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: EventType;
  assignedPersonnel: string[];
  assignedVehicles: string[];
  urgency: UrgencyLevel;
}

export interface InventoryItem {
  id: string;
  name: string;
  family: string;
  subfamily: string;
  quantity: number;
  minStock: number;
  unit: string;
  entryDate: string;
  expiryDate?: string;
  location: string;
  building?: string;
  area: ServiceArea;
}

export interface Vehicle {
  id: string;
  code: string;
  model: string;
  plate: string;
  type: VehicleType;
  status: VehicleStatus;
  lastCheck: string;
  documents: VehicleDocument[];
  maintenanceHistory: MaintenanceRecord[];
  location?: { lat: number; lng: number; lastUpdate: string };
}

export interface VehicleDocument {
  id: string;
  name: string;
  expiryDate?: string;
  fileUrl?: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  performedBy: string;
  nextRevisionDate?: string;
}

export interface Hydrant {
  id: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  type: 'Columna' | 'Arqueta';
  status: 'Operativo' | 'Mantenimiento' | 'Fuera de Servicio';
  lastRevision: string;
  nextRevision: string;
  pressure?: number;
}

export interface BuildingPlan {
  id: string;
  buildingName: string;
  address: string;
  uploadDate: string;
  fileName: string;
  description: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  timestamp: string;
}

export interface DietRule {
  id: string;
  minHours: number;
  amount: number;
  label: string;
}

// Volunteer simplificado para mock
export interface MockVolunteer {
  id: string;
  name: string;
  surname: string;
  email: string;
  badgeNumber: string;
  rank: string;
  systemRole: SystemRole;
  operationalRole: OperationalRole;
  area: string;
  status: string;
  avatarUrl: string;
  municipio: string;
  kmAllowance: number;
  capabilities: VolunteerCapabilities;
}
