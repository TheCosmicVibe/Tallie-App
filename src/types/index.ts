export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum WaitlistStatus {
  WAITING = 'waiting',
  NOTIFIED = 'notified',
  SEATED = 'seated',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  availableTables: number[];
}

export interface AvailabilityRequest {
  restaurantId: number;
  date: string;
  partySize: number;
  duration?: number;
}

export interface AvailabilityResponse {
  date: string;
  partySize: number;
  availableSlots: TimeSlot[];
  suggestedTables: TableSuggestion[];
}

export interface TableSuggestion {
  tableId: number;
  tableNumber: string;
  capacity: number;
  reason: string;
  score: number;
}

export interface CreateRestaurantDto {
  name: string;
  openingTime: string;
  closingTime: string;
  totalTables: number;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CreateTableDto {
  tableNumber: string;
  capacity: number;
  location?: string;
  isActive?: boolean;
}

export interface CreateReservationDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  duration?: number;
  specialRequests?: string;
}

export interface UpdateReservationDto {
  reservationDate?: string;
  reservationTime?: string;
  partySize?: number;
  duration?: number;
  status?: ReservationStatus;
  specialRequests?: string;
}

export interface CreateWaitlistDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  preferredTime?: string;
  notes?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPayload {
  to: string;
  subject: string;
  message: string;
  type: 'email' | 'sms';
}
