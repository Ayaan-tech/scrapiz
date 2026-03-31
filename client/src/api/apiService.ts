import axios from 'axios';
import { API_CONFIG, ApiResponse, RegisterRequest, LoginRequest, VerifyOtpRequest, PasswordResetRequest, NotificationSettings, ServiceBookingPayload, ServiceBooking, PushNotificationPreferences, AppleUserInfo, PlatformInfo, AppleLoginResponse, PhoneVerifyRequest, PhoneVerifyResponse, PhoneCompleteProfileRequest, PhoneCompleteProfileResponse, PhoneConfirmLinkRequest, PhoneConfirmLinkResponse } from './config';
import { ReferredUser, ReferralTransaction } from '../types/referral';
import { DeletionFeedback } from '../types/account';
import { SecureStorageService } from '../services/secureStorage';

export type { NotificationSettings, ServiceBookingPayload, ServiceBooking, PushNotificationPreferences } from './config';
export type { DeletionFeedback } from '../types/account';
// Re-export phone auth types for consumers
export type { PhoneVerifyRequest, PhoneVerifyResponse, PhoneCompleteProfileRequest, PhoneCompleteProfileResponse, PhoneConfirmLinkRequest, PhoneConfirmLinkResponse, PhoneAuthUser, PhoneVerifySuccessResponse, PhoneVerifyProfileRequiredResponse, PhoneCompleteProfileSuccessResponse, PhoneCompleteProfileLinkRequiredResponse, PhoneConfirmLinkSuccessResponse, PhoneConfirmLinkCancelledResponse } from './config';

// User types
export interface ProductSummary {
  id: number;
  name: string;
  max_rate: number;
  min_rate: number;
  unit: string;
  description: string;
  category: number;
  image_url?: string | null;
  trees_saved_per_unit?: number;
  co2_reduced_per_unit?: number;
}

export interface CategorySummary {
  id: number;
  name: string;
  image_url?: string | null;
}

export interface OrderItemSummary {
  id: number;
  order_no: number;
  product: ProductSummary;
  quantity: string;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  user: string;
  created_at: string;
  status: any;
  address: number;
  orders: OrderItemSummary[];
  estimated_order_value?: number;
  redeemed_referral_bonus?: number;
}

export interface AddressSummary {
  id: number;
  name: string;
  phone_number: string;
  room_number: string;
  street: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: number;
  delivery_suggestion: string;
  user: number;
  is_default: boolean;
}

export interface CreateAddressRequest {
  name: string;
  phone_number: string;
  room_number: string;
  street: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: number;
  delivery_suggestion?: string;
  user?: number;
}

export type UpdateAddressRequest = Partial<CreateAddressRequest>;

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  is_staff: boolean;
  phone_number?: string; // User's phone number
  gender?: 'male' | 'female' | 'prefer_not_to_say'; // User's gender
  orders: OrderSummary[];
  addresses: AddressSummary[];
  referral_code?: string; // User's unique referral code to share
  referred_balance?: string; // Accumulated referral earnings
  has_completed_first_order?: boolean; // Whether user has completed their first order
  has_used_referral_code?: boolean; // Whether user has applied a friend's referral code
  profile_image?: string; // URL to user's profile image
  avatar_provider?: string | null; // Avatar service provider (e.g., 'dicebear')
  avatar_style?: string | null; // DiceBear avatar style (e.g., 'avataaars', 'pixel-art')
  avatar_seed?: string | null; // Seed for deterministic avatar generation
}

// Waitlist types
export interface WaitlistRequest {
  email?: string;
  phone_number?: string;
  city: string;
}

export interface WaitlistResponse {
  message: string;
  city: string;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: API_CONFIG.HEADERS,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const frontendKey = API_CONFIG.HEADERS['x-auth-app'] as string | undefined;
    if (frontendKey) {
      if (!config.headers) config.headers = {} as any;
      (config.headers as any)['x-auth-app'] = frontendKey;
    }

    const token = await SecureStorageService.getAuthToken();
    if (token) {
      // Backend expects raw token in Authorization header (no "Bearer " prefix)
      if (!config.headers) config.headers = {} as any;
      (config.headers as any).Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global session expired handler (will be set by AuthProvider)
let globalSessionExpiredHandler: ((shouldShow: boolean) => void) | null = null;
let currentRouteGetter: (() => string | null) | null = null;
let lastSessionExpiredTrigger = 0;
const SESSION_EXPIRED_DEBOUNCE = 2000; // 2 seconds debounce

export const setGlobalSessionExpiredHandler = (handler: (shouldShow: boolean) => void) => {
  globalSessionExpiredHandler = handler;
};

export const setCurrentRouteGetter = (getter: () => string | null) => {
  currentRouteGetter = getter;
};

// Check if current route should show session expired dialog
const shouldShowSessionExpired = (currentRoute: string | null): boolean => {
  if (!currentRoute) return false;

  // Don't show on auth pages, splash screen, or initial loading
  const excludedRoutes = [
    '/(auth)',
    '/login',
    '/register',
    '/forgot-password',
    '/language-selection',
    '/location-permission',
    '/service-unavailable',
    '/oauthredirect',
    '/',

  ];

  // Check if current route matches any excluded route
  return !excludedRoutes.some(route => currentRoute.includes(route));
};

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    console.error('API Error:', data || error.message);

    if (status === 401 || status === 403) {
      // Only clear the stored token if it matches the one used in the failed request.
      // This prevents a stale 401 (from a previous session) from wiping a freshly
      // stored token after a new OAuth login.
      const failedToken = error.config?.headers?.Authorization;
      const currentToken = await SecureStorageService.getAuthToken().catch(() => null);
      if (failedToken && currentToken && failedToken === currentToken) {
        try { await SecureStorageService.removeAuthToken(); } catch { }
      }

      // Debounce to prevent multiple rapid triggers
      const now = Date.now();
      if (now - lastSessionExpiredTrigger < SESSION_EXPIRED_DEBOUNCE) {
        return Promise.reject(error);
      }
      lastSessionExpiredTrigger = now;

      // Get current route and check if we should show dialog
      const currentRoute = currentRouteGetter ? currentRouteGetter() : null;
      const shouldShow = shouldShowSessionExpired(currentRoute);

      // Trigger session expired dialog only on protected routes
      if (globalSessionExpiredHandler && shouldShow) {
        globalSessionExpiredHandler(shouldShow);
      }
    }
    return Promise.reject(error);
  }
);

const notificationKeyMap: Record<keyof NotificationSettings, string> = {
  pushNotifications: 'push_notifications',
  pickupReminders: 'pickup_reminders',
  orderUpdates: 'order_updates',
  paymentAlerts: 'payment_alerts',
  promotionalOffers: 'promotional_offers',
  weeklyReports: 'weekly_reports',
  emailNotifications: 'email_notifications',
  smsNotifications: 'sms_notifications',
};

const mapNotificationResponse = (data: any): NotificationSettings => ({
  pushNotifications: !!data?.push_notifications,
  pickupReminders: !!data?.pickup_reminders,
  orderUpdates: !!data?.order_updates,
  paymentAlerts: !!data?.payment_alerts,
  promotionalOffers: !!data?.promotional_offers,
  weeklyReports: !!data?.weekly_reports,
  emailNotifications: !!data?.email_notifications,
  smsNotifications: !!data?.sms_notifications,
});

const mapNotificationPayload = (payload: Partial<NotificationSettings>) => {
  const result: Record<string, boolean> = {};
  Object.entries(payload).forEach(([key, value]) => {
    const mappedKey = notificationKeyMap[key as keyof NotificationSettings];
    if (mappedKey !== undefined && value !== undefined) {
      result[mappedKey] = value;
    }
  });
  return result;
};

// Authentication API Service
export class AuthService {
  // Register user
  static async register(data: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REGISTER, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Verify OTP
  static async verifyOtp(data: VerifyOtpRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.put(API_CONFIG.ENDPOINTS.VERIFY_OTP, data);

      // Store JWT token if provided - enables automatic login after verification
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'OTP verification failed');
    }
  }

  // Resend OTP
  static async resendOtp(email: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.RESEND_OTP, { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to resend OTP');
    }
  }

  // Login user
  static async login(data: LoginRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, data);
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  // Google OAuth login
  static async googleLogin(idToken: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GOOGLE_LOGIN, {
        id_token: idToken,
      });
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Google login failed');
    }
  }

  /**
   * Apple OAuth login with nonce verification and platform metadata.
   * 
   * @param identityToken - Apple's identity JWT containing hashed nonce
   * @param nonce - Raw (unhashed) nonce for backend verification
   * @param user - Optional user info (name) from first sign-in
   * @param email - Optional email from first sign-in
   * @param platformInfo - Device/OS metadata for audit logging
   * @returns AppleLoginResponse with JWT or requires_link_confirmation flag
   */
  static async appleLogin(
    identityToken: string,
    nonce: string,
    user?: AppleUserInfo,
    email?: string | null,
    platformInfo?: PlatformInfo
  ): Promise<AppleLoginResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.APPLE_LOGIN, {
        identity_token: identityToken,
        nonce: nonce,
        user: user,
        email: email,
        platform_info: platformInfo,
      });

      // Store JWT in SecureStore on success (not when link confirmation required)
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Apple login failed');
    }
  }

  /**
   * Confirm or reject Apple account linking to existing email account.
   * 
   * @param identityToken - Apple's identity JWT (re-verified for freshness)
   * @param nonce - Raw nonce for verification
   * @param confirmed - true to link accounts, false to cancel
   * @returns AppleLoginResponse with JWT on success
   */
  static async appleLoginConfirmLink(
    identityToken: string,
    nonce: string,
    confirmed: boolean
  ): Promise<AppleLoginResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.APPLE_LOGIN_CONFIRM, {
        identity_token: identityToken,
        nonce: nonce,
        confirmed: confirmed,
      });

      // Store JWT in SecureStore on successful link confirmation
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Account linking failed');
    }
  }

  /**
   * Verify Firebase phone auth token with backend.
   * 
   * For existing users: Returns JWT and user data for immediate authentication.
   * For new users: Returns profile_required flag indicating profile completion is needed.
   * 
   * @param firebaseToken - Firebase ID token from successful OTP verification
   * @returns PhoneVerifyResponse - Either success with JWT or profile_required response
   * 
   * @see Requirements 6.1 - POST /api/authentication/phone/verify/
   */
  static async phoneVerify(firebaseToken: string): Promise<PhoneVerifyResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PHONE_VERIFY, {
        firebase_token: firebaseToken,
      });

      // Store JWT in SecureStore on success (existing user)
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Phone verification failed');
    }
  }

  /**
   * Complete profile for new phone auth user.
   * 
   * For new email: Creates user account and returns JWT.
   * For existing email: Returns requires_link_confirmation flag for account linking flow.
   * 
   * @param data - Profile data including name, email, phone_number, and firebase_uid
   * @returns PhoneCompleteProfileResponse - Either success with JWT or link confirmation required
   * 
   * @see Requirements 6.2 - POST /api/authentication/phone/complete-profile/
   */
  static async phoneCompleteProfile(data: PhoneCompleteProfileRequest): Promise<PhoneCompleteProfileResponse> {
    try {
      const payload: Record<string, string> = {
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        firebase_uid: data.firebase_uid,
      };
      if (data.promo_code) {
        payload.promo_code = data.promo_code;
      }
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PHONE_COMPLETE_PROFILE, payload);

      // Store JWT in SecureStore on success (new user created)
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Profile completion failed');
    }
  }

  /**
   * Confirm or cancel account linking for phone auth.
   * 
   * When confirmed=true: Links phone number to existing account and returns JWT.
   * When confirmed=false: Cancels linking and returns cancellation message.
   * 
   * @param data - Link confirmation data including confirmed flag, email, phone_number, and firebase_uid
   * @returns PhoneConfirmLinkResponse - Either success with JWT or cancellation message
   * 
   * @see Requirements 6.3 - POST /api/authentication/phone/confirm-link/
   */
  static async phoneConfirmLink(data: PhoneConfirmLinkRequest): Promise<PhoneConfirmLinkResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PHONE_CONFIRM_LINK, {
        confirmed: data.confirmed,
        email: data.email,
        phone_number: data.phone_number,
        firebase_uid: data.firebase_uid,
      });

      // Store JWT in SecureStore on successful link confirmation
      if (response.data.jwt) {
        await SecureStorageService.setAuthToken(response.data.jwt);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Account linking failed');
    }
  }

  // Logout user
  static async logout(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOGOUT);
      await SecureStorageService.removeAuthToken();
      return response.data;
    } catch (error: any) {
      // Even if logout fails, remove local token
      await SecureStorageService.removeAuthToken();
      throw new Error(error.response?.data?.error || 'Logout failed');
    }
  }

  // Password reset request
  static async passwordResetRequest(email: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PASSWORD_RESET_REQUEST, { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset request failed');
    }
  }

  // Password reset
  static async passwordReset(data: PasswordResetRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PASSWORD_RESET, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset failed');
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStorageService.getAuthToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Get stored auth token
  static async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStorageService.getAuthToken();
    } catch (error) {
      return null;
    }
  }

  // Get current user profile
  static async getUser(): Promise<UserProfile> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER);
      return response.data as UserProfile;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch user');
    }
  }

  // Update current user's name
  static async updateUserName(name: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.patch(API_CONFIG.ENDPOINTS.USER, { name });
      return response.data as ApiResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update user');
    }
  }

  // Update user profile (name, phone, gender, profile image, and/or avatar settings)
  static async updateUserProfile(data: {
    name?: string;
    phone_number?: string;
    gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
    profile_image?: string | null;
    avatar_provider?: string | null;
    avatar_style?: string | null;
    avatar_seed?: string | null;
    promo_code?: string;
  }): Promise<UserProfile> {
    try {
      const formData = new FormData();

      // Add name if provided
      if (data.name !== undefined) {
        formData.append('name', data.name);
      }

      // Add phone_number if provided
      if (data.phone_number !== undefined) {
        formData.append('phone_number', data.phone_number);
      }

      // Add gender if provided
      if (data.gender !== undefined) {
        if (data.gender === null || data.gender === '') {
          formData.append('gender', '');
        } else {
          formData.append('gender', data.gender);
        }
      }

      // Handle profile_image
      if (data.profile_image !== undefined) {
        if (data.profile_image === null || data.profile_image === '') {
          // Empty string means remove the image
          formData.append('profile_image', '');
        } else if (data.profile_image.startsWith('file://') || data.profile_image.startsWith('content://')) {
          // Local file URI - upload new image
          const filename = data.profile_image.split('/').pop() || 'profile.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('profile_image', {
            uri: data.profile_image,
            name: filename,
            type,
          } as any);
        }
        // If it's an S3 URL, don't include it (no change)
      }

      // Handle avatar_provider
      if (data.avatar_provider !== undefined) {
        formData.append('avatar_provider', data.avatar_provider === null ? '' : data.avatar_provider);
      }

      // Handle avatar_style
      if (data.avatar_style !== undefined) {
        formData.append('avatar_style', data.avatar_style === null ? '' : data.avatar_style);
      }

      // Handle avatar_seed
      if (data.avatar_seed !== undefined) {
        formData.append('avatar_seed', data.avatar_seed === null ? '' : data.avatar_seed);
      }

      // Handle promo_code (referral code applied after OAuth registration)
      if (data.promo_code) {
        formData.append('promo_code', data.promo_code.toUpperCase());
      }

      const token = await SecureStorageService.getAuthToken();
      const frontendKey = API_CONFIG.HEADERS['x-auth-app'] as string;

      const response = await apiClient.patch(
        API_CONFIG.ENDPOINTS.USER,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-auth-app': frontendKey,
            Authorization: token || '',
          },
        }
      );

      return response.data as UserProfile;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  }

  // Delete current user
  static async deleteUser(): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete(API_CONFIG.ENDPOINTS.USER);
      return response.data as ApiResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete user');
    }
  }

  // Delete current user with feedback
  static async deleteUserWithFeedback(
    feedback: DeletionFeedback
  ): Promise<ApiResponse> {
    try {
      console.log('🗑️ Deleting account with feedback:', {
        reason: feedback.reason,
        hasComments: !!feedback.comments,
        endpoint: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.USER
      });

      const response = await apiClient.delete(API_CONFIG.ENDPOINTS.USER, {
        data: {
          reason: feedback.reason,
          comments: feedback.comments || ''
        }
      });

      console.log('✅ Account deletion response:', response.data);

      // Clear local auth token on successful deletion using SecureStore
      await SecureStorageService.removeAuthToken();

      return response.data as ApiResponse;
    } catch (error: any) {
      console.error('❌ Account deletion error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        fullError: error
      });
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete account');
    }
  }

  // Address APIs
  static async getAddresses(): Promise<AddressSummary[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER_ADDRESSES);
      return response.data as AddressSummary[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch addresses');
    }
  }

  static async createAddress(payload: CreateAddressRequest): Promise<AddressSummary> {
    try {
      // Some backends require 'user' in payload; include it proactively
      let body: CreateAddressRequest = { ...payload };
      if (!body.user) {
        try {
          const user = await AuthService.getUser();
          body.user = user.id;
        } catch { }
      }
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.USER_ADDRESSES, body);
      return response.data as AddressSummary;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create address');
    }
  }

  static async updateAddress(id: number, payload: UpdateAddressRequest): Promise<AddressSummary> {
    try {
      let body: any = { ...payload };
      if (!('user' in body)) {
        try {
          const user = await AuthService.getUser();
          body.user = user.id;
        } catch { }
      }
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.USER_ADDRESSES}${id}/`, body);
      return response.data as AddressSummary;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update address');
    }
  }

  static async deleteAddress(id: number): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete(`${API_CONFIG.ENDPOINTS.USER_ADDRESSES}${id}/`);

      // 204 No Content is the standard response for successful DELETE
      // It may not have a response body
      if (response.status === 204) {
        return { message: 'Address deleted successfully' };
      }

      // 200 OK with a message body
      return response.data as ApiResponse;
    } catch (error: any) {
      console.error('Delete address error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete address');
    }
  }

  static async setDefaultAddress(id: number): Promise<AddressSummary> {
    try {
      const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.USER_ADDRESSES}${id}/set-default/`, {});
      return response.data as AddressSummary;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to set default address');
    }
  }

  // Inventory APIs
  static async getCategories(): Promise<CategorySummary[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.INVENTORY_CATEGORIES);
      return response.data as CategorySummary[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch categories');
    }
  }

  static async getProducts(): Promise<ProductSummary[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.INVENTORY_PRODUCTS);
      return response.data as ProductSummary[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch products');
    }
  }

  // Content APIs
  static async getCarouselImages(): Promise<any[]> {
    try {
      const response = await apiClient.get('/content/carousel/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch carousel images');
    }
  }

  static async getOrderNos(): Promise<OrderSummary[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.INVENTORY_ORDERNOS);
      return response.data as OrderSummary[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch orders');
    }
  }

  static async createOrder(
    items: Array<{ product_id: number; quantity: number }>,
    address_id?: number,
    imageUris?: string[],
    estimatedOrderValue?: number,
    referralAmount?: number
  ): Promise<any> {
    try {
      console.log('createOrder called with:');
      console.log('- items:', items);
      console.log('- address_id:', address_id);
      console.log('- imageUris:', imageUris);
      console.log('- estimatedOrderValue:', estimatedOrderValue);

      const formData = new FormData();

      // Add items as JSON string
      formData.append('items', JSON.stringify(items));

      // Add address_id if provided
      if (address_id) {
        formData.append('address_id', address_id.toString());
      }

      // Add estimated_order_value if provided
      if (estimatedOrderValue !== undefined) {
        formData.append('estimated_order_value', estimatedOrderValue.toString());
      }

      // Add referral_amount if provided
      if (referralAmount !== undefined && referralAmount > 0) {
        formData.append('referral_amount', referralAmount.toString());
      }

      // Add images if provided
      if (imageUris && imageUris.length > 0) {
        console.log(`Adding ${imageUris.length} images to FormData`);
        for (let i = 0; i < imageUris.length; i++) {
          const uri = imageUris[i];
          const filename = uri.split('/').pop() || `image_${i}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          console.log(`Image ${i}: uri=${uri}, filename=${filename}, type=${type}`);

          formData.append('images', {
            uri,
            name: filename,
            type,
          } as any);
        }
      } else {
        console.log('No images to upload');
      }

      const token = await SecureStorageService.getAuthToken();
      const frontendKey = API_CONFIG.HEADERS['x-auth-app'] as string;

      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.INVENTORY_CREATE_ORDER,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-auth-app': frontendKey,
            Authorization: token || '',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create order');
    }
  }

  static async cancelOrder(payload: { order_number?: string; order_id?: number }): Promise<any> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.INVENTORY_CANCEL_ORDER, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to cancel order');
    }
  }

  static async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER_NOTIFICATION_SETTINGS);
      return mapNotificationResponse(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch notification settings');
    }
  }

  static async updateNotificationSettings(payload: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const response = await apiClient.patch(
        API_CONFIG.ENDPOINTS.USER_NOTIFICATION_SETTINGS,
        mapNotificationPayload(payload)
      );
      return mapNotificationResponse(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update notification settings');
    }
  }

  static async createServiceBooking(payload: ServiceBookingPayload): Promise<ServiceBooking> {
    try {
      console.log('📡 API Call - Creating service booking');
      console.log('Endpoint:', API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SERVICE_BOOKINGS);
      console.log('Payload:', {
        service: payload.service,
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        preferred_datetime: payload.preferredDateTime,
        notes: payload.notes,
      });

      const response = await apiClient.post(API_CONFIG.ENDPOINTS.SERVICE_BOOKINGS, {
        service: payload.service,
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        preferred_datetime: payload.preferredDateTime,
        notes: payload.notes,
        service_details: payload.service_details,
      });

      console.log('📡 API Response:', response.data);
      return response.data?.booking as ServiceBooking;
    } catch (error: any) {
      console.error('📡 API Error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw new Error(error.response?.data?.error || error.message || 'Failed to submit service booking');
    }
  }

  static async getServiceBookings(): Promise<ServiceBooking[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SERVICE_BOOKINGS);
      return response.data as ServiceBooking[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch bookings');
    }
  }

  // Get list of users referred by current user
  static async getReferredUsers(): Promise<ReferredUser[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.REFERRED_USERS);
      return response.data.referrals as ReferredUser[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch referred users');
    }
  }

  // Get referral transaction history
  static async getReferralTransactions(): Promise<ReferralTransaction[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.REFERRAL_TRANSACTIONS);
      return response.data.transactions as ReferralTransaction[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch referral transactions');
    }
  }

  // Redeem referral balance on order
  static async redeemReferralBalance(orderId: number, amount: number): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REDEEM_REFERRAL_BALANCE, {
        order_id: orderId,
        amount: amount
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to redeem referral balance');
    }
  }

  // Register push notification token
  static async registerPushToken(token: string, deviceName?: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REGISTER_PUSH_TOKEN, {
        token,
        device_name: deviceName || ''
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to register push token');
    }
  }

  // Unregister push notification token
  static async unregisterPushToken(token: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.UNREGISTER_PUSH_TOKEN, {
        token
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to unregister push token');
    }
  }

  // Get push notification preferences
  static async getPushNotificationPreferences(): Promise<PushNotificationPreferences> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PUSH_NOTIFICATION_PREFERENCES);
      return response.data.preferences;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get push notification preferences');
    }
  }

  // Update push notification preferences
  static async updatePushNotificationPreferences(preferences: Partial<PushNotificationPreferences>): Promise<ApiResponse> {
    try {
      const response = await apiClient.put(API_CONFIG.ENDPOINTS.PUSH_NOTIFICATION_PREFERENCES, preferences);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update push notification preferences');
    }
  }
}

// Waitlist API Service
export class WaitlistService {
  // Submit waitlist entry
  static async submitWaitlist(data: WaitlistRequest): Promise<WaitlistResponse> {
    try {
      const response = await apiClient.post('/waitlist/', data, {
        headers: {
          'x-auth-app': API_CONFIG.HEADERS['x-auth-app'] as string,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to submit waitlist entry');
    }
  }
}

// Serviceability types
export interface ServiceableCity {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: 'available' | 'coming_soon';
  pincode_count?: number;
}

export interface ServiceabilityResponse {
  serviceable: boolean;
  city?: ServiceableCity;
  distance_km?: number;
  nearest_city?: {
    name: string;
    state: string;
    distance_km: number;
  };
  message?: string;
  status?: 'available' | 'coming_soon';
}

export interface CheckPincodeRequest {
  pincode: string;
}

export interface CheckCoordinatesRequest {
  latitude: number;
  longitude: number;
}

// Serviceability API Service
export class ServiceabilityAPI {
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY_MS = 1000;

  /**
   * Retry helper for API calls with exponential backoff
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = ServiceabilityAPI.MAX_RETRIES
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry on client errors (4xx) except 429 (rate limit)
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      // Retry on network errors or server errors (5xx)
      if (retries > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, ServiceabilityAPI.RETRY_DELAY_MS * (ServiceabilityAPI.MAX_RETRIES - retries + 1))
        );
        return ServiceabilityAPI.retryWithBackoff(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if a pincode is serviceable
   * @param pincode - 6-digit Indian postal code
   * @returns ServiceabilityResponse with serviceability status and city details
   */
  static async checkPincode(pincode: string): Promise<ServiceabilityResponse> {
    try {
      // Validate pincode format before making API call
      if (!pincode || !/^[1-9]\d{5}$/.test(pincode)) {
        throw new Error('Invalid pincode format. Pincode must be exactly 6 digits and start with 1-9');
      }

      const response = await ServiceabilityAPI.retryWithBackoff(async () => {
        return await apiClient.post(
          API_CONFIG.ENDPOINTS.SERVICEABILITY_CHECK_PINCODE,
          { pincode }
        );
      });

      return response.data as ServiceabilityResponse;
    } catch (error: any) {
      console.error('ServiceabilityAPI.checkPincode error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to check pincode serviceability'
      );
    }
  }

  /**
   * Check if coordinates are within serviceable area
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns ServiceabilityResponse with serviceability status and nearest city
   */
  static async checkCoordinates(
    latitude: number,
    longitude: number
  ): Promise<ServiceabilityResponse> {
    try {
      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude. Must be between -90 and 90');
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude. Must be between -180 and 180');
      }

      const response = await ServiceabilityAPI.retryWithBackoff(async () => {
        return await apiClient.post(
          API_CONFIG.ENDPOINTS.SERVICEABILITY_CHECK_COORDINATES,
          { latitude, longitude }
        );
      });

      return response.data as ServiceabilityResponse;
    } catch (error: any) {
      console.error('ServiceabilityAPI.checkCoordinates error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to check coordinate serviceability'
      );
    }
  }

  /**
   * Get list of all serviceable cities (public endpoint for caching)
   * @returns Array of ServiceableCity objects
   */
  static async getCities(): Promise<ServiceableCity[]> {
    try {
      const response = await ServiceabilityAPI.retryWithBackoff(async () => {
        return await apiClient.get(API_CONFIG.ENDPOINTS.SERVICEABILITY_PUBLIC_CITIES);
      });

      return response.data as ServiceableCity[];
    } catch (error: any) {
      console.error('ServiceabilityAPI.getCities error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch serviceable cities'
      );
    }
  }

  /**
   * Get list of all serviceable pincodes (public endpoint for caching)
   * @returns Array of pincode strings
   */
  static async getPincodes(): Promise<string[]> {
    try {
      const response = await ServiceabilityAPI.retryWithBackoff(async () => {
        return await apiClient.get(API_CONFIG.ENDPOINTS.SERVICEABILITY_PUBLIC_PINCODES);
      });

      // Backend returns array of pincode strings directly
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }

      return [];
    } catch (error: any) {
      console.error('ServiceabilityAPI.getPincodes error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch serviceable pincodes'
      );
    }
  }

}


// Feedback types
export interface FeedbackQuestion {
  id: number;
  question_text: string;
  question_type: 'rating' | 'text' | 'multiple_choice' | 'boolean';
  context: string;
  order: number;
  is_required: boolean;
  placeholder_text?: string | null;
  options?: string[] | null;
}

export interface FeedbackResponseData {
  question_id: number;
  rating_value?: number;
  text_value?: string;
  boolean_value?: boolean;
  choice_value?: string;
}

export interface SubmitFeedbackRequest {
  order_id?: number | null;
  context?: string;
  responses: FeedbackResponseData[];
}

// Feedback API Service
export class FeedbackService {
  /**
   * Get active feedback questions for a context
   */
  static async getQuestions(context: string = 'order_completion'): Promise<FeedbackQuestion[]> {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.FEEDBACK_QUESTIONS}?context=${context}`
      );
      return response.data.questions as FeedbackQuestion[];
    } catch (error: any) {
      console.error('FeedbackService.getQuestions error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch feedback questions');
    }
  }

  /**
   * Submit feedback responses
   */
  static async submitFeedback(data: SubmitFeedbackRequest): Promise<{ success: boolean; session_id: number }> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.FEEDBACK_SUBMIT, data);
      return response.data;
    } catch (error: any) {
      console.error('FeedbackService.submitFeedback error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit feedback');
    }
  }

  /**
   * Check if feedback has been submitted for an order
   */
  static async checkFeedbackStatus(orderId: number): Promise<boolean> {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.FEEDBACK_STATUS}${orderId}/`
      );
      return response.data.has_feedback;
    } catch (error: any) {
      console.error('FeedbackService.checkFeedbackStatus error:', error);
      return false;
    }
  }
}

// Rating types (re-exported from types/rating.ts)
export type {
  RatingTag,
  PendingOrder,
  RatingCheck,
  RatingSubmission,
  RatingResponse,
  PendingRatingsResponse,
  RatingCheckResponse
} from '../types/rating';

import type {
  PendingOrder,
  RatingCheck,
  RatingSubmission,
  RatingResponse
} from '../types/rating';

// Order Rating API Service
export class RatingService {
  /**
   * Get orders eligible for rating (completed orders without ratings)
   * @returns Array of pending orders with agent information
   */
  static async getPendingRatings(): Promise<PendingOrder[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.RATINGS_PENDING);
      return response.data.pending_orders as PendingOrder[];
    } catch (error: any) {
      console.error('RatingService.getPendingRatings error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch pending ratings');
    }
  }

  /**
   * Check if an order has been rated
   * @param orderId - The order ID to check
   * @returns RatingCheck with is_rated status and agent name
   */
  static async checkOrderRating(orderId: number): Promise<RatingCheck> {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.RATINGS_CHECK}${orderId}/`
      );
      return {
        is_rated: response.data.is_rated,
        agent_name: response.data.agent_name
      } as RatingCheck;
    } catch (error: any) {
      console.error('RatingService.checkOrderRating error:', error);
      throw new Error(error.response?.data?.error || 'Failed to check order rating');
    }
  }

  /**
   * Submit a rating for an order
   * @param data - Rating submission data including order_id, rating, tags, and feedback
   * @returns RatingResponse with success status and rating_id
   */
  static async submitRating(data: RatingSubmission): Promise<RatingResponse> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.RATINGS_SUBMIT, {
        order_id: data.order_id,
        rating: data.rating,
        tags: data.tags || [],
        feedback: data.feedback || ''
      });
      return response.data as RatingResponse;
    } catch (error: any) {
      console.error('RatingService.submitRating error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit rating');
    }
  }
}
