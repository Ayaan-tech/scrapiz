import { API_CONFIG } from '../api/config';
import {
  BookingStatusEvent,
  LeadAcceptedEvent,
  LocationUpdateEvent,
  VendorDispatchedEvent,
} from '../types/orderTracking';

interface OrderTrackingSocketHandlers {
  onVendorDispatched?: (event: VendorDispatchedEvent) => void;
  onLeadAccepted?: (event: LeadAcceptedEvent) => void;
  onLocationUpdate?: (event: LocationUpdateEvent) => void;
  onBookingStatus?: (event: BookingStatusEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  onPong?: () => void;
}

function buildSocketUrl(orderId: number, token: string) {
  const origin = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
  const wsOrigin = origin.replace(/^http/, 'ws');
  return `${wsOrigin}/ws/order/${orderId}/?token=${encodeURIComponent(token)}`;
}

export class OrderTrackingSocket {
  private readonly orderId: number;
  private readonly token: string;
  private handlers: OrderTrackingSocketHandlers;
  private readonly maxDelay = 30000;
  private reconnectDelay = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private manualClose = false;
  private ws: WebSocket | null = null;

  constructor(orderId: number, token: string, handlers: OrderTrackingSocketHandlers) {
    this.orderId = orderId;
    this.token = token;
    this.handlers = handlers;
  }

  updateHandlers(handlers: OrderTrackingSocketHandlers) {
    this.handlers = handlers;
  }

  connect() {
    this.manualClose = false;
    this.clearReconnectTimer();

    this.ws = new WebSocket(buildSocketUrl(this.orderId, this.token));

    this.ws.onopen = () => {
      this.reconnectDelay = 2000;
      this.startPing();
      this.handlers.onConnectionChange?.(true);
    };

    this.ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);

        switch (data.type) {
          case 'vendor_dispatched':
            this.handlers.onVendorDispatched?.(data as VendorDispatchedEvent);
            break;
          case 'lead_accepted':
            this.handlers.onLeadAccepted?.(data as LeadAcceptedEvent);
            break;
          case 'location_update':
            this.handlers.onLocationUpdate?.(data as LocationUpdateEvent);
            break;
          case 'booking_status':
            this.handlers.onBookingStatus?.(data as BookingStatusEvent);
            break;
          case 'pong':
            this.handlers.onPong?.();
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Failed to parse tracking websocket message', error);
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.handlers.onConnectionChange?.(false);

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.handlers.onConnectionChange?.(false);
    };
  }

  forceReconnect() {
    this.disconnect(false);
    this.connect();
  }

  disconnect(manual = true) {
    this.manualClose = manual;
    this.stopPing();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  ping() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.ping(), 20000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
