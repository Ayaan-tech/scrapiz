import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Linking } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { AuthService } from '../api/apiService';
import { DEFAULT_CENTER, calculateDistance } from '../config/mapConfig';
import { SecureStorageService } from '../services/secureStorage';
import { OrderTrackingSocket } from '../services/orderTrackingSocket';
import {
  BookingStatusEvent,
  estimateEtaMinutes,
  LeadAcceptedEvent,
  LocationUpdateEvent,
  OrderTrackingResponse,
  TrackingCompletionSummary,
  TrackingConnectionState,
  TrackingCoordinate,
  TrackingPhase,
  TrackingStep,
  TrackingVendorPin,
  TrackingVendorSummary,
  VendorDispatchedEvent,
  normalizeTrackingStep,
} from '../types/orderTracking';

interface OrderTrackingContextValue {
  orderId: number;
  pickup: TrackingCoordinate;
  phase: TrackingPhase;
  connectionState: TrackingConnectionState;
  vendorPins: TrackingVendorPin[];
  notifiedVendorCount: number;
  expiresAt: string | null;
  acceptedVendor: TrackingVendorSummary | null;
  vendorLocation: TrackingCoordinate | null;
  bookingId: string | null;
  bookingStatus: string | null;
  step: TrackingStep;
  distanceKm: number | null;
  etaMinutes: number | null;
  completionSummary: TrackingCompletionSummary | null;
  isBootstrapping: boolean;
  refreshFromRest: () => Promise<void>;
  retryMatching: () => Promise<void>;
  cancelOrder: () => void;
  callVendor: () => Promise<void>;
}

const DEFAULT_PICKUP: TrackingCoordinate = {
  lng: DEFAULT_CENTER[0],
  lat: DEFAULT_CENTER[1],
};

const POLL_INTERVAL_MS = 30000;

const OrderTrackingContext = createContext<OrderTrackingContextValue | undefined>(undefined);

function coerceCoordinate(lat?: number | null, lng?: number | null): TrackingCoordinate | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  return { lat: Number(lat), lng: Number(lng) };
}

function normalizeVendor(data?: Partial<TrackingVendorSummary> | null): TrackingVendorSummary | null {
  if (!data || data.id === undefined || !data.name) {
    return null;
  }

  return {
    id: Number(data.id),
    name: data.name,
    phone: data.phone ?? null,
    vehicle_type: data.vehicle_type ?? null,
    vehicle_number: data.vehicle_number ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    rating: data.rating ?? null,
    last_location_update: data.last_location_update ?? null,
  };
}

function normalizePins(pins?: TrackingVendorPin[] | null): TrackingVendorPin[] {
  return (pins || []).filter((pin) => pin?.lat !== undefined && pin?.lng !== undefined).map((pin) => ({
    vendor_id: Number(pin.vendor_id),
    name: pin.name,
    lat: Number(pin.lat),
    lng: Number(pin.lng),
    distance_km: pin.distance_km ?? null,
    vehicle_type: pin.vehicle_type ?? null,
    vehicle_number: pin.vehicle_number ?? null,
    phone: pin.phone ?? null,
    rating: pin.rating ?? null,
  }));
}

export function OrderTrackingProvider({
  orderId,
  children,
}: {
  orderId: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const socketRef = useRef<OrderTrackingSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pickup, setPickup] = useState<TrackingCoordinate>(DEFAULT_PICKUP);
  const [phase, setPhase] = useState<TrackingPhase>('searching');
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>('connecting');
  const [vendorPins, setVendorPins] = useState<TrackingVendorPin[]>([]);
  const [notifiedVendorCount, setNotifiedVendorCount] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [acceptedVendor, setAcceptedVendor] = useState<TrackingVendorSummary | null>(null);
  const [vendorLocation, setVendorLocation] = useState<TrackingCoordinate | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState<TrackingCompletionSummary | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((refresh: () => Promise<void>) => {
    if (pollingRef.current) {
      return;
    }

    pollingRef.current = setInterval(() => {
      refresh().catch((error) => {
        console.error('Tracking REST polling failed', error);
      });
    }, POLL_INTERVAL_MS);
  }, []);

  const applyBookingState = useCallback((status?: string | null, extra?: TrackingCompletionSummary) => {
    const normalizedStatus = (status || '').toLowerCase() || 'en_route';
    setBookingStatus(normalizedStatus);

    if (extra?.total_payout !== undefined || extra?.line_items?.length) {
      setCompletionSummary({
        total_payout: extra.total_payout ?? null,
        line_items: extra.line_items ?? [],
      });
    }

    if (normalizedStatus === 'no_vendor') {
      setPhase('no_vendor');
      return;
    }

    if (normalizedStatus === 'completed') {
      setPhase('completed');
      return;
    }

    setPhase('en_route');
  }, []);

  const applyVendorDispatched = useCallback((event: VendorDispatchedEvent) => {
    const pins = normalizePins(event.vendor_pins);
    setVendorPins(pins);
    setNotifiedVendorCount(event.vendor_count ?? pins.length);
    setExpiresAt(event.expires_at ?? null);
    setPhase((current) => (current === 'completed' ? current : 'searching'));
  }, []);

  const applyLeadAccepted = useCallback((event: LeadAcceptedEvent) => {
    const vendor = normalizeVendor(event.vendor);
    const nextLocation = coerceCoordinate(vendor?.lat, vendor?.lng);

    setAcceptedVendor(vendor);
    setVendorLocation(nextLocation);
    setBookingId(event.booking_id ?? null);
    setVendorPins((current) => {
      if (!vendor) {
        return current;
      }

      const matched = current.find((pin) => pin.vendor_id === vendor.id);
      if (matched) {
        return [{ ...matched, phone: vendor.phone ?? matched.phone }];
      }

      if (nextLocation) {
        return [{
          vendor_id: vendor.id,
          name: vendor.name,
          lat: nextLocation.lat,
          lng: nextLocation.lng,
          distance_km: null,
          vehicle_type: vendor.vehicle_type ?? null,
          vehicle_number: vendor.vehicle_number ?? null,
          phone: vendor.phone ?? null,
          rating: vendor.rating ?? null,
        }];
      }

      return [];
    });
    applyBookingState('en_route');
  }, [applyBookingState]);

  const applyLocationUpdate = useCallback((event: LocationUpdateEvent) => {
    const nextLocation = coerceCoordinate(event.latitude, event.longitude);
    const vendor = normalizeVendor(event.vendor);

    if (vendor) {
      setAcceptedVendor((current) => ({
        ...(current || vendor),
        ...vendor,
      }));
    }

    if (nextLocation) {
      setVendorLocation(nextLocation);
    }

    if (event.booking_status) {
      applyBookingState(event.booking_status);
    }
  }, [applyBookingState]);

  const updateFromRestPayload = useCallback((payload: OrderTrackingResponse) => {
    const nextPickup = coerceCoordinate(payload.pickup_lat, payload.pickup_lng);
    if (nextPickup) {
      setPickup(nextPickup);
    }

    const nextPins = normalizePins(payload.lead?.vendor_pins);
    if (nextPins.length > 0 && !payload.booking) {
      setVendorPins(nextPins);
    }

    setNotifiedVendorCount(payload.lead?.vendor_count_notified ?? nextPins.length);

    if (payload.booking) {
      const vendor = normalizeVendor(payload.booking.vendor);
      const nextLocation = coerceCoordinate(vendor?.lat, vendor?.lng);

      setAcceptedVendor(vendor);
      setVendorLocation(nextLocation);
      setBookingId(payload.booking.id);
      applyBookingState(payload.booking.status);
      return;
    }

    setBookingId(null);
    setAcceptedVendor(null);
    setVendorLocation(null);
    setBookingStatus(null);

    if ((payload.lead?.status || '').toLowerCase() === 'pending') {
      setPhase('searching');
    }
  }, [applyBookingState]);

  const refreshFromRest = useCallback(async () => {
    const payload = await AuthService.getOrderTracking(orderId);
    updateFromRestPayload(payload);
  }, [orderId, updateFromRestPayload]);

  const loadNearbyVendors = useCallback(async () => {
    try {
      const pins = await AuthService.getNearbyVendors(orderId);
      if (!pins.length || acceptedVendor) {
        return;
      }

      setVendorPins(normalizePins(pins));
      setNotifiedVendorCount((current) => current || pins.length);
    } catch (error) {
      console.log('Nearby vendor preload unavailable', error);
    }
  }, [acceptedVendor, orderId]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await Promise.allSettled([refreshFromRest(), loadNearbyVendors()]);

        const token = await SecureStorageService.getAuthToken();
        if (!token || !isMounted) {
          setConnectionState('offline');
          startPolling(refreshFromRest);
          return;
        }

        const socket = new OrderTrackingSocket(orderId, token, {
          onVendorDispatched: applyVendorDispatched,
          onLeadAccepted: applyLeadAccepted,
          onLocationUpdate: applyLocationUpdate,
          onBookingStatus: (event: BookingStatusEvent) => {
            if (event.booking_id) {
              setBookingId(event.booking_id);
            }
            applyBookingState(event.status ?? event.booking_status, event);
          },
          onConnectionChange: (connected) => {
            setConnectionState(connected ? 'connected' : 'offline');
            if (connected) {
              stopPolling();
              refreshFromRest().catch((error) => {
                console.error('Tracking refresh on reconnect failed', error);
              });
            } else {
              startPolling(refreshFromRest);
            }
          },
        });

        socketRef.current = socket;
        socket.connect();
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    initialize().catch((error) => {
      console.error('Failed to initialize order tracking', error);
      setConnectionState('offline');
      startPolling(refreshFromRest);
      setIsBootstrapping(false);
    });

    return () => {
      isMounted = false;
      stopPolling();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [
    applyBookingState,
    applyLeadAccepted,
    applyLocationUpdate,
    applyVendorDispatched,
    loadNearbyVendors,
    orderId,
    refreshFromRest,
    startPolling,
    stopPolling,
  ]);

  useEffect(() => {
    if (phase === 'searching' && expiresAt) {
      const timer = setInterval(() => {
        if (new Date(expiresAt).getTime() <= Date.now() && !bookingId) {
          setPhase('no_vendor');
        }
      }, 1000);

      return () => clearInterval(timer);
    }

    return undefined;
  }, [bookingId, expiresAt, phase]);

  useEffect(() => {
    if (bookingStatus === 'completed' && !pathname.endsWith('/complete')) {
      router.replace(`/tracking/${orderId}/complete` as any);
    }
  }, [bookingStatus, orderId, pathname, router]);

  const distanceKm = useMemo(() => {
    if (!vendorLocation) {
      return null;
    }

    return Number(
      calculateDistance([vendorLocation.lng, vendorLocation.lat], [pickup.lng, pickup.lat]).toFixed(2)
    );
  }, [pickup.lat, pickup.lng, vendorLocation]);

  const etaMinutes = useMemo(() => estimateEtaMinutes(distanceKm), [distanceKm]);
  const step = useMemo(() => normalizeTrackingStep(bookingStatus), [bookingStatus]);

  const retryMatching = useCallback(async () => {
    setPhase('searching');
    await Promise.allSettled([refreshFromRest(), loadNearbyVendors()]);
    socketRef.current?.forceReconnect();
  }, [loadNearbyVendors, refreshFromRest]);

  const cancelOrder = useCallback(() => {
    Alert.alert('Cancel pickup', 'Do you want to cancel this pickup request?', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.cancelOrder({ order_id: orderId });
            router.replace('/(tabs)/home' as any);
          } catch (error: any) {
            Alert.alert('Unable to cancel', error?.message || 'Please try again in a moment.');
          }
        },
      },
    ]);
  }, [orderId, router]);

  const callVendor = useCallback(async () => {
    if (!acceptedVendor?.phone) {
      Alert.alert('Phone unavailable', 'The vendor phone number will appear as soon as it is shared.');
      return;
    }

    const telUrl = `tel:${acceptedVendor.phone}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (canOpen) {
      await Linking.openURL(telUrl);
    }
  }, [acceptedVendor?.phone]);

  const value = useMemo<OrderTrackingContextValue>(() => ({
    orderId,
    pickup,
    phase,
    connectionState,
    vendorPins,
    notifiedVendorCount,
    expiresAt,
    acceptedVendor,
    vendorLocation,
    bookingId,
    bookingStatus,
    step,
    distanceKm,
    etaMinutes,
    completionSummary,
    isBootstrapping,
    refreshFromRest,
    retryMatching,
    cancelOrder,
    callVendor,
  }), [
    acceptedVendor,
    bookingId,
    bookingStatus,
    callVendor,
    cancelOrder,
    completionSummary,
    connectionState,
    distanceKm,
    etaMinutes,
    expiresAt,
    isBootstrapping,
    notifiedVendorCount,
    orderId,
    phase,
    pickup,
    refreshFromRest,
    retryMatching,
    step,
    vendorLocation,
    vendorPins,
  ]);

  return <OrderTrackingContext.Provider value={value}>{children}</OrderTrackingContext.Provider>;
}

export function useOrderTracking() {
  const context = useContext(OrderTrackingContext);
  if (!context) {
    throw new Error('useOrderTracking must be used within OrderTrackingProvider');
  }

  return context;
}
