export const SERVICE_BOOKING_ROUTES = {
  DEMOLITION: '/services/demolition-book',
  DISMANTLING: '/services/dismantling-book',
  SOCIETY_TIEUP: '/services/society-tieup-book',
  JUNK_REMOVAL: '/services/debris-book',
  PAPER_SHREDDING: '/services/paper-shredding-book',
} as const;

const SERVICE_BOOKING_ROUTE_MAP: Record<string, string> = {
  demolition: SERVICE_BOOKING_ROUTES.DEMOLITION,
  dismantling: SERVICE_BOOKING_ROUTES.DISMANTLING,
  'society-tieup': SERVICE_BOOKING_ROUTES.SOCIETY_TIEUP,
  'junk-removal': SERVICE_BOOKING_ROUTES.JUNK_REMOVAL,
  'paper-shredding': SERVICE_BOOKING_ROUTES.PAPER_SHREDDING,
};

export const getServiceBookingRoute = (serviceId: string) =>
  SERVICE_BOOKING_ROUTE_MAP[serviceId] ?? `/services/${serviceId}/book`;
