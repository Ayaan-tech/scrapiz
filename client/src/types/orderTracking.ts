export type TrackingPhase = 'searching' | 'en_route' | 'no_vendor' | 'completed';
export type TrackingConnectionState = 'connecting' | 'connected' | 'offline';
export type TrackingStep = 'en_route' | 'arrived' | 'collecting' | 'ready' | 'completed';

export interface TrackingCoordinate {
  lat: number;
  lng: number;
}

export interface TrackingVendorPin {
  vendor_id: number;
  name: string;
  lat: number;
  lng: number;
  distance_km?: number | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  phone?: string | null;
  rating?: number | null;
}

export interface TrackingVendorSummary {
  id: number;
  name: string;
  phone?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  last_location_update?: string | null;
}

export interface TrackingNearbyAgent {
  id: number;
  agent_code: string;
  name: string;
  phone: string;
  email: string;
  profile_image_url?: string | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  average_rating?: number | null;
  rating_count?: number | null;
  availability?: string | null;
  coverage_location?: string | null;
  match_reason?: string | null;
  lat?: number | null;
  lng?: number | null;
  service_pincodes?: Array<{
    pincode: string;
    city__name: string;
  }>;
  service_areas?: Array<{
    name: string;
    pincode__pincode: string;
    pincode__city__name: string;
  }>;
}

export interface TrackingLeadData {
  status?: string | null;
  vendor_count_notified?: number | null;
  vendor_pins?: TrackingVendorPin[];
}

export interface TrackingBookingData {
  id: string;
  status: string;
  vendor: TrackingVendorSummary;
}

export interface OrderTrackingResponse {
  order_id: number;
  order_status?: string | null;
  lead?: TrackingLeadData | null;
  booking?: TrackingBookingData | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
}

export interface TrackingLineItem {
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface TrackingCompletionSummary {
  total_payout?: number | null;
  line_items?: TrackingLineItem[];
}

export interface VendorDispatchedEvent {
  type: 'vendor_dispatched';
  lead_id?: string;
  vendor_count?: number;
  vendor_pins?: TrackingVendorPin[];
  expires_at?: string | null;
}

export interface LeadAcceptedEvent {
  type: 'lead_accepted';
  booking_id?: string;
  vendor?: TrackingVendorSummary | null;
}

export interface LocationUpdateEvent {
  type: 'location_update';
  latitude?: number;
  longitude?: number;
  vendor?: TrackingVendorSummary | null;
  booking_status?: string | null;
  timestamp?: string;
}

export interface BookingStatusEvent extends TrackingCompletionSummary {
  type: 'booking_status';
  booking_id?: string;
  status?: string | null;
  booking_status?: string | null;
}

export function normalizeTrackingStep(status?: string | null): TrackingStep {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'completed') return 'completed';
  if (normalized === 'ready') return 'ready';
  if (normalized === 'in_progress' || normalized === 'collecting') return 'collecting';
  if (normalized === 'arrived') return 'arrived';
  return 'en_route';
}

export function formatTrackingDistance(distanceKm?: number | null): string {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return 'Estimating distance';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

export function estimateEtaMinutes(distanceKm?: number | null): number | null {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return null;
  }

  const averageUrbanKmPerMinute = 0.35;
  return Math.max(2, Math.round(distanceKm / averageUrbanKmPerMinute));
}
