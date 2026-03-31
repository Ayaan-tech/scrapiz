// API Configuration
import Constants from 'expo-constants';

const FRONTEND_KEY =
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_FRONTEND_SECRET ||
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_FRONTEND_SECRET ||
  process.env.EXPO_PUBLIC_FRONTEND_SECRET ||
  'Scrapiz#0nn$(tab!z';

console.log("frontend key is ",FRONTEND_KEY)
export const API_CONFIG = {
  BASE_URL: 'https://api.scrapiz.in/api',
  ENDPOINTS: {
    // Authentication endpoints
    REGISTER: '/authentication/register/',
    LOGIN: '/authentication/login/',
    LOGOUT: '/authentication/logout/',
    VERIFY_OTP: '/authentication/register/', // PUT request
    RESEND_OTP: '/authentication/resendotp/',
    PASSWORD_RESET_REQUEST: '/authentication/password-reset-request/',
    PASSWORD_RESET: '/authentication/password-reset/',
    USER: '/authentication/user/',
    GOOGLE_LOGIN: '/authentication/google-login/',
    APPLE_LOGIN: '/authentication/apple-login/',
    APPLE_LOGIN_CONFIRM: '/authentication/apple-login/confirm-link/',
    // Phone OTP Authentication endpoints
    PHONE_VERIFY: '/authentication/phone/verify/',
    PHONE_COMPLETE_PROFILE: '/authentication/phone/complete-profile/',
    PHONE_CONFIRM_LINK: '/authentication/phone/confirm-link/',
    USER_ADDRESSES: '/user/address/',
    USER_NOTIFICATION_SETTINGS: '/user/notification-settings/',
    SERVICE_BOOKINGS: '/services/bookings/',
    REGISTER_PUSH_TOKEN: '/user/register-push-token/',
    UNREGISTER_PUSH_TOKEN: '/user/unregister-push-token/',
    PUSH_NOTIFICATION_PREFERENCES: '/user/notification-preferences/',
    
    // Referral endpoints
    REFERRED_USERS: '/authentication/referrals/users/',
    REFERRAL_TRANSACTIONS: '/authentication/referrals/transactions/',
    REDEEM_REFERRAL_BALANCE: '/authentication/referrals/redeem/',
    
    // Inventory
    INVENTORY_CATEGORIES: '/inventory/categories/',
    INVENTORY_PRODUCTS: '/inventory/products/',
    INVENTORY_ORDERNOS: '/inventory/ordernos/',
    INVENTORY_CREATE_ORDER: '/inventory/create-order/',
    INVENTORY_CANCEL_ORDER: '/inventory/cancel-order/',
    
    // Feedback
    FEEDBACK_QUESTIONS: '/feedback/questions/',
    FEEDBACK_SUBMIT: '/feedback/submit/',
    FEEDBACK_STATUS: '/feedback/status/',
    
    // Order Ratings
    RATINGS_PENDING: '/feedback/ratings/pending/',
    RATINGS_CHECK: '/feedback/ratings/check/',
    RATINGS_SUBMIT: '/feedback/ratings/submit/',
    
    // Serviceability
    SERVICEABILITY_CITIES: '/serviceability/cities/',
    SERVICEABILITY_CHECK_PINCODE: '/serviceability/check-pincode/',
    SERVICEABILITY_CHECK_COORDINATES: '/serviceability/check-coordinates/',
    SERVICEABILITY_PINCODES: '/serviceability/pincodes/',
    // Public endpoints for mobile caching (no auth required)
    SERVICEABILITY_PUBLIC_CITIES: '/serviceability/public/cities/',
    SERVICEABILITY_PUBLIC_PINCODES: '/serviceability/public/pincodes/',
  },
  HEADERS: {
    'Content-Type': 'application/json',
    'x-auth-app': FRONTEND_KEY,
  },
};

// API Response types
export interface ApiResponse {
  message?: string;
  jwt?: string;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  confirm_password: string;
  promo_code?: string; // Optional referral/promo code
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}
export interface PasswordResetRequest {
  email: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  pickupReminders: boolean;
  orderUpdates: boolean;
  paymentAlerts: boolean;
  promotionalOffers: boolean;
  weeklyReports: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface PushNotificationPreferences {
  push_notification_enabled: boolean;
  order_updates: boolean;
  promotions: boolean;
  announcements: boolean;
  general: boolean;
}

export interface ServiceBookingPayload {
  service: string;
  name: string;
  phone: string;
  address: string;
  preferredDateTime: string;
  notes?: string;
  service_details?: {
    service_type?: string;
    structure_type?: string;
    [key: string]: any;
  };
}

export interface ServiceBooking {
  id: number;
  service: string;
  name: string;
  phone: string;
  address: string;
  preferred_datetime: string;
  status: string;
  meeting_link?: string | null;
  meeting_event_id?: string | null;
  service_details?: {
    service_type?: string;
    structure_type?: string;
    [key: string]: any;
  } | null;
  created_at: string;
  notes?: string | null;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface GoogleLoginResponse extends ApiResponse {
  jwt?: string;
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

// Apple OAuth types
export interface AppleUserInfo {
  firstName?: string | null;
  lastName?: string | null;
}

export interface PlatformInfo {
  os: string;
  osVersion: string;
  deviceModel?: string;
}

export interface AppleLoginRequest {
  identity_token: string;
  nonce: string;
  user?: AppleUserInfo;
  email?: string | null;
  platform_info?: PlatformInfo;
}

export interface AppleLoginResponse extends ApiResponse {
  jwt?: string;
  user?: {
    id: number;
    email: string;
    name: string;
  };
  requires_link_confirmation?: boolean;
  existing_email?: string;
}

export interface AppleLoginConfirmRequest {
  identity_token: string;
  nonce: string;
  confirmed: boolean;
}


// Phone OTP Authentication types

/**
 * Request for /phone/verify/ endpoint
 */
export interface PhoneVerifyRequest {
  firebase_token: string;
}

/**
 * User data returned on successful phone authentication
 */
export interface PhoneAuthUser {
  id: number;
  email: string;
  name: string;
}

/**
 * Response from /phone/verify/ for existing users (successful auth)
 */
export interface PhoneVerifySuccessResponse extends ApiResponse {
  jwt: string;
  user: PhoneAuthUser;
}

/**
 * Response from /phone/verify/ for new users (profile required)
 */
export interface PhoneVerifyProfileRequiredResponse extends ApiResponse {
  profile_required: true;
  phone_number: string;
  firebase_uid: string;
}

/**
 * Union type for /phone/verify/ responses
 */
export type PhoneVerifyResponse = PhoneVerifySuccessResponse | PhoneVerifyProfileRequiredResponse;

/**
 * Request for /phone/complete-profile/ endpoint
 */
export interface PhoneCompleteProfileRequest {
  name: string;
  email: string;
  phone_number: string;
  firebase_uid: string;
  promo_code?: string;
}

/**
 * Response from /phone/complete-profile/ on success (new user created)
 */
export interface PhoneCompleteProfileSuccessResponse extends ApiResponse {
  jwt: string;
  user: PhoneAuthUser;
}

/**
 * Response from /phone/complete-profile/ when email collision detected
 */
export interface PhoneCompleteProfileLinkRequiredResponse extends ApiResponse {
  requires_link_confirmation: true;
  existing_email: string;
  auth_provider: string;
}

/**
 * Union type for /phone/complete-profile/ responses
 */
export type PhoneCompleteProfileResponse = PhoneCompleteProfileSuccessResponse | PhoneCompleteProfileLinkRequiredResponse;

/**
 * Request for /phone/confirm-link/ endpoint
 */
export interface PhoneConfirmLinkRequest {
  confirmed: boolean;
  email: string;
  phone_number: string;
  firebase_uid: string;
}

/**
 * Response from /phone/confirm-link/ on successful linking
 */
export interface PhoneConfirmLinkSuccessResponse extends ApiResponse {
  jwt: string;
  user: PhoneAuthUser;
}

/**
 * Response from /phone/confirm-link/ when cancelled
 */
export interface PhoneConfirmLinkCancelledResponse extends ApiResponse {
  message: string;
}

/**
 * Union type for /phone/confirm-link/ responses
 */
export type PhoneConfirmLinkResponse = PhoneConfirmLinkSuccessResponse | PhoneConfirmLinkCancelledResponse;
