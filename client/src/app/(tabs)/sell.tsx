import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import {
  Plus,
  Minus,
  Calendar,
  Wallet,
  MapPin,
  Camera,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Phone,
  User,
  X,
  FileText,
  Scale,
  AlertCircle,
  Check,
  Clock,
  Image as ImageIcon,
  Info,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { AuthService, ProductSummary, AddressSummary, CategorySummary } from '../../api/apiService';
import { useReferral } from '../../context/ReferralContext';
import { useOrderCalculationStore } from '../../store/orderCalculationStore';
import { RemoteImage } from '../../components/RemoteImage';
import { useTheme } from '../../context/ThemeContext';
import { sellTutorialConfig } from '../../config/tutorials/homeTutorial';
import { useTutorialStore } from '../../store/tutorialStore';
import TutorialOverlay from '../../components/TutorialOverlay';
import { useLocation } from '../../context/LocationContext';
import SellLocationGate from '../../components/SellLocationGate';
import SellServiceUnavailable from '../../components/SellServiceUnavailable';
import {
  hasSellServiceabilityBeenChecked,
  getSellServiceAvailability,
  setSellServiceability,
  resetSellServiceability
} from '../../utils/sellServiceability';
import { isSellScreenGateEnforcedCached } from '../../utils/sellScreenEnforcement';
import FeedbackModal from '../../components/FeedbackModal';
import NetworkRetryOverlay from '../../components/NetworkRetryOverlay';
import { useNetworkRetry } from '../../hooks/useNetworkRetry';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import {
  saveGuestOrderState,
  loadGuestOrderState,
  clearGuestOrderState,
  hasGuestOrderState,
  type GuestOrderState
} from '../../utils/guestOrderPersistence';
const { width, height } = Dimensions.get('window');

type SelectedItem = {
  id: number;
  name: string;
  rate: number;
  unit: string;
  quantity: number;
  image?: any;
};

const allTimeSlots = [
  { label: '9:00 AM - 11:00 AM', startHour: 9 },
  { label: '11:00 AM - 1:00 PM', startHour: 11 },
  { label: '1:00 PM - 3:00 PM', startHour: 13 },
  { label: '3:00 PM - 5:00 PM', startHour: 15 },
  { label: '5:00 PM - 7:00 PM', startHour: 17 },
];

// Get current hour in IST (UTC+5:30)
const getISTHour = (): number => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 3600000;
  return new Date(istMs).getHours();
};

// Get available time slots based on selected date and current IST time
const getAvailableTimeSlots = (dateStr: string) => {
  // Check if selected date is today — use IST timezone so comparison is consistent with getISTHour
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  if (dateStr !== todayStr) return allTimeSlots;
  const currentHour = getISTHour();
  return allTimeSlots.filter(slot => slot.startHour > currentHour);
};

const stepTitles = [
  'Select Items',
  'Schedule Pickup',
  'Pickup Address',
  'Order Summary'
];

// Helper to get product image - checks S3 URL first, then falls back to local assets
const getImageForProduct = (product: ProductSummary) => {
  // Priority 1: Use S3 image if available
  if (product.image_url) {
    return { uri: product.image_url };
  }

  // Priority 2: Fallback to local assets based on product name
  const name = product.name.toLowerCase();
  if (name.includes('newspaper')) return require('../../../assets/images/Scrap_Rates_Photos/Newspaper.jpg');
  if (name.includes('cardboard')) return require('../../../assets/images/Scrap_Rates_Photos/Cardboard.jpg');
  if (name.includes('book') || name.includes('paper')) return require('../../../assets/images/Scrap_Rates_Photos/Book.jpg');
  if (name.includes('plastic')) return require('../../../assets/images/Scrap_Rates_Photos/Plastics.jpg');
  if (name.includes('iron') || name.includes('steel')) return require('../../../assets/images/Scrap_Rates_Photos/Iron.jpg');
  if (name.includes('aluminum') || name.includes('aluminium')) return require('../../../assets/images/Scrap_Rates_Photos/Aluminium.jpg');
  if (name.includes('copper')) return require('../../../assets/images/Scrap_Rates_Photos/Copper.jpg');
  if (name.includes('brass')) return require('../../../assets/images/Scrap_Rates_Photos/Brass.jpg');
  if (name.includes('tin')) return require('../../../assets/images/Scrap_Rates_Photos/Tin.jpg');
  if (name.includes('refrigerator')) return require('../../../assets/images/Scrap_Rates_Photos/fridge.jpg');
  if (name.includes('battery')) return require('../../../assets/images/Scrap_Rates_Photos/Battery.jpg');
  if (name.includes('front load machine')) return require('../../../assets/images/Scrap_Rates_Photos/FrontLoadMachine.jpg');
  if (name.includes('tv')) return require('../../../assets/images/Scrap_Rates_Photos/TV.jpg');
  if (name.includes('laptops')) return require('../../../assets/images/Scrap_Rates_Photos/Laptops.jpg');
  if (name.includes('windowac')) return require('../../../assets/images/Scrap_Rates_Photos/WindowAC.jpg');
  if (name.includes('printer')) return require('../../../assets/images/Scrap_Rates_Photos/Printer.jpg');
  if (name.includes('microwave')) return require('../../../assets/images/Scrap_Rates_Photos/Microwave.jpg');
  if (name.includes('glass')) return require('../../../assets/images/Scrap_Rates_Photos/glass.jpg');
  return null;
};

// Helper to get fallback image for a product (used by RemoteImage component)
const getFallbackImageForProduct = (productName: string) => {
  const name = productName.toLowerCase();
  if (name.includes('newspaper')) return require('../../../assets/images/Scrap_Rates_Photos/Newspaper.jpg');
  if (name.includes('cardboard')) return require('../../../assets/images/Scrap_Rates_Photos/Cardboard.jpg');
  if (name.includes('book') || name.includes('paper')) return require('../../../assets/images/Scrap_Rates_Photos/Book.jpg');
  if (name.includes('plastic')) return require('../../../assets/images/Scrap_Rates_Photos/Plastics.jpg');
  if (name.includes('iron') || name.includes('steel')) return require('../../../assets/images/Scrap_Rates_Photos/Iron.jpg');
  if (name.includes('aluminum') || name.includes('aluminium')) return require('../../../assets/images/Scrap_Rates_Photos/Aluminium.jpg');
  if (name.includes('copper')) return require('../../../assets/images/Scrap_Rates_Photos/Copper.jpg');
  if (name.includes('brass')) return require('../../../assets/images/Scrap_Rates_Photos/Brass.jpg');
  if (name.includes('tin')) return require('../../../assets/images/Scrap_Rates_Photos/Tin.jpg');
  if (name.includes('refrigerator')) return require('../../../assets/images/Scrap_Rates_Photos/fridge.jpg');
  if (name.includes('battery')) return require('../../../assets/images/Scrap_Rates_Photos/Battery.jpg');
  if (name.includes('front load machine')) return require('../../../assets/images/Scrap_Rates_Photos/FrontLoadMachine.jpg');
  if (name.includes('tv')) return require('../../../assets/images/Scrap_Rates_Photos/TV.jpg');
  if (name.includes('laptops')) return require('../../../assets/images/Scrap_Rates_Photos/Laptops.jpg');
  if (name.includes('windowac')) return require('../../../assets/images/Scrap_Rates_Photos/WindowAC.jpg');
  if (name.includes('printer')) return require('../../../assets/images/Scrap_Rates_Photos/Printer.jpg');
  if (name.includes('microwave')) return require('../../../assets/images/Scrap_Rates_Photos/Microwave.jpg');
  if (name.includes('glass')) return require('../../../assets/images/Scrap_Rates_Photos/glass.jpg');
  // Default fallback
  return require('../../../assets/images/Scrap_Rates_Photos/TV.jpg');
};

// Gate states for serviceability check
type SellScreenState = 'checking' | 'location_gate' | 'not_serviceable' | 'serviceable';

type ScrapCategoryKey = 'paper' | 'plastic' | 'metal' | 'electronic';

const SCRAP_CATEGORY_CARDS: Array<{
  key: ScrapCategoryKey;
  label: string;
  image: any;
}> = [
  {
    key: 'paper',
    label: 'Paper Scrap',
    image: require('../../../assets/images/categories/paper_Scrap.png'),
  },
  {
    key: 'plastic',
    label: 'Plastic Scrap',
    image: require('../../../assets/images/categories/plastic_Scrap.png'),
  },
  {
    key: 'metal',
    label: 'Metal Scrap',
    image: require('../../../assets/images/categories/metal_Scrap.png'),
  },
  {
    key: 'electronic',
    label: 'Electronic Scrap',
    image: require('../../../assets/images/categories/Electronic_scrap.png'),
  },
];

const SCRAP_CATEGORY_DETAILS: Record<ScrapCategoryKey, {
  title: string;
  sectionTitle: string;
  headImage: any;
  contactImage: any;
  lightBackground: string;
  darkBackground: string;
  accent: string;
  accentDark: string;
  sellBtn: string;
}> = {
  paper: {
    title: 'Paper Scrap',
    sectionTitle: 'Types of Paper Scrap',
    headImage: require('../../../assets/images/sell/paper_head.png'),
    contactImage: require('../../../assets/images/sell/paper_contactUS.png'),
    lightBackground: '#E7CFAE',
    darkBackground: '#E7CFAE',
    accent: '#b7864e',
    accentDark: '#d8ad7a',
    sellBtn: '#b7864e',
  },
  plastic: {
    title: 'Plastic Scrap',
    sectionTitle: 'Types of Plastic Scrap',
    headImage: require('../../../assets/images/sell/plastic_head.png'),
    contactImage: require('../../../assets/images/sell/plastic_ContactUs.png'),
    lightBackground: '#A7D2F2',
    darkBackground: '#A7D2F2',
    accent: '#6ea3c9',
    accentDark: '#8dbde0',
    sellBtn: '#6ea3c9',
  },
  metal: {
    title: 'Metal Scrap',
    sectionTitle: 'Types of Metal Scrap',
    headImage: require('../../../assets/images/sell/meta_head.png'),
    contactImage: require('../../../assets/images/sell/metal_ContactUs.png'),
    lightBackground: '#E7716E',
    darkBackground: '#E7716E',
    accent: '#c07444',
    accentDark: '#d5956b',
    sellBtn: '#c07444',
  },
  electronic: {
    title: 'Electronic Scrap',
    sectionTitle: 'Types of Electronic Scrap',
    headImage: require('../../../assets/images/sell/electronic_head.png'),
    contactImage: require('../../../assets/images/sell/electronic_contactUs.png'),
    lightBackground: '#F9E28D',
    darkBackground: '#F9E28D',
    accent: '#d5a24a',
    accentDark: '#e1b15e',
    sellBtn: '#d5a24a',
  },
};

const matchesScrapCategory = (categoryName: string, categoryKey: ScrapCategoryKey): boolean => {
  const normalized = categoryName.toLowerCase();
  if (categoryKey === 'paper') return normalized.includes('paper') || normalized.includes('cardboard') || normalized.includes('book');
  if (categoryKey === 'plastic') return normalized.includes('plastic');
  if (categoryKey === 'metal') return normalized.includes('metal') || normalized.includes('iron') || normalized.includes('steel') || normalized.includes('brass') || normalized.includes('copper') || normalized.includes('aluminium') || normalized.includes('aluminum');
  return normalized.includes('electronic') || normalized.includes('e-waste') || normalized.includes('ewaste') || normalized.includes('appliance');
};

export default function SellScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { locationSet, serviceAvailable } = useLocation();

  // Serviceability gate state
  const [screenState, setScreenState] = useState<SellScreenState>('checking');
  const [enforceSellGate, setEnforceSellGate] = useState<boolean>(true); // Default to enforced

  // Check serviceability on mount
  useEffect(() => {
    checkServiceability();
  }, []);

  const checkServiceability = async () => {
    try {
      // First, check if sell screen gating is enforced from backend
      const shouldEnforce = await isSellScreenGateEnforcedCached();

      setEnforceSellGate(shouldEnforce);

      // If enforcement is disabled, skip gating logic entirely
      if (!shouldEnforce) {
        console.log('🚀 Sell screen gate enforcement disabled - allowing direct access');
        setScreenState('serviceable');
        return;
      }

      // Original gating logic (only runs if enforcement is enabled)
      console.log('🔒 Sell screen gate enforcement enabled - checking serviceability');

      // If location is already set and service is available from context, allow access
      if (locationSet && serviceAvailable) {
        await setSellServiceability(true);
        setScreenState('serviceable');
        return;
      }

      // Check if we've already done the serviceability check for sell
      const hasChecked = await hasSellServiceabilityBeenChecked();

      if (hasChecked) {
        const isAvailable = await getSellServiceAvailability();
        if (isAvailable) {
          setScreenState('serviceable');
        } else {
          setScreenState('not_serviceable');
        }
      } else {
        // Need to show location gate
        setScreenState('location_gate');
      }
    } catch (error) {
      console.error('Error checking sell screen enforcement:', error);
      // On error, default to showing the content (fail open for better UX)
      setScreenState('serviceable');
    }
  };

  const handleServiceable = () => {
    setScreenState('serviceable');
  };

  const handleNotServiceable = () => {
    setScreenState('not_serviceable');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  const handleRetryPincode = async () => {
    // Reset the serviceability state so user can re-enter pincode
    await resetSellServiceability();
    // Show the location gate again
    setScreenState('location_gate');
  };

  // Show loading while checking
  if (screenState === 'checking') {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>
          Checking service availability...
        </Text>
      </View>
    );
  }

  // Show location gate if not checked yet
  if (screenState === 'location_gate') {
    return (
      <SellLocationGate
        onServiceable={handleServiceable}
        onNotServiceable={handleNotServiceable}
      />
    );
  }

  // Show service unavailable screen
  if (screenState === 'not_serviceable') {
    return (
      <SellServiceUnavailable
        onGoHome={handleGoHome}
        onRetryPincode={handleRetryPincode}
      />
    );
  }

  // Continue with normal sell screen (serviceable)
  return <SellScreenContent />;
}

// Extracted the original sell screen content into a separate component
function SellScreenContent() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Auth guard for guest flow - check if user is authenticated
  const { isGuest, isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();

  // Get step parameter for restoring guest order flow after authentication
  const { step: stepParam } = useLocalSearchParams<{ step?: string }>();

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [showTypesLanding, setShowTypesLanding] = useState(true);
  const [selectedLandingCategory, setSelectedLandingCategory] = useState<ScrapCategoryKey | null>(null);
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  // Tutorial system integration
  const { setStepTarget, currentScreen } = useTutorialStore();
  const stepIndicatorRef = useRef<View>(null);
  const itemSelectionRef = useRef<View>(null);
  const quantityControlsRef = useRef<View>(null);
  const dateTimeRef = useRef<View>(null);
  const addressRef = useRef<View>(null);
  const summaryRef = useRef<View>(null);
  const {
    items: selectedItems,
    estimatedValue,
    referralBonus,
    deliveryCharge,
    totalPayout,
    useReferralBonus,
    customReferralAmount,
    setItems,
    addItem: addItemToStore,
    updateItemQuantity,
    removeItem: removeItemFromStore,
    setAvailableReferralBalance,
    toggleReferralBonus,
    setCustomReferralAmount,
    resetOrder,
    setTotalPayout,
    getTotalWeight,
  } = useOrderCalculationStore();

  const [addressForm, setAddressForm] = useState({
    title: '',
    addressLine: '',
    landmark: '',
    city: '',
    pinCode: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    mobile: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Quantity selector modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [tempQuantity, setTempQuantity] = useState('1');

  const activeCategoryTheme = selectedLandingCategory
    ? SCRAP_CATEGORY_DETAILS[selectedLandingCategory]
    : null;
  const modalAccent = activeCategoryTheme
    ? (isDark ? activeCategoryTheme.accentDark : activeCategoryTheme.accent)
    : colors.primary;
  const modalSoftBg = activeCategoryTheme
    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)')
    : (isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4');

  // Referral wallet - use context
  const { walletBalance, setWalletBalance, updateBalanceAndCache, applyReferralDiscount } = useReferral();
  const [useReferralBalance, setUseReferralBalance] = useState(false);
  const [rewardInputValue, setRewardInputValue] = useState('');
  const [rewardApplied, setRewardApplied] = useState(false);

  // Breakdown sidebar state
  const [showBreakdownSidebar, setShowBreakdownSidebar] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(width)).current;

  // Data loading function wrapped in useCallback for network retry
  // Products and categories are loaded for all users (including guests)
  // Addresses are only loaded for authenticated users
  const loadDataFn = useCallback(async () => {
    setLoadingData(true);
    try {
      // Load products and categories first (no auth required)
      const [prods, cats] = await Promise.all([
        AuthService.getProducts(),
        AuthService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);

      // Load addresses only for authenticated users
      if (isAuthenticated) {
        try {
          const addrs = await AuthService.getAddresses();
          setAddresses(addrs);

          if (addrs.length > 0) {
            setSelectedAddressId(addrs[0].id);
            setUseNewAddress(false);
          }
        } catch (addressError) {
          // Silently fail for address loading - user can still proceed
          console.log('Could not load addresses (user may not be authenticated):', addressError);
        }
      }
    } finally {
      setLoadingData(false);
    }
  }, [isAuthenticated]);

  // Network retry hook for handling connection issues
  const {
    showRetryOverlay,
    countdown,
    isRetrying,
    hasFailedPermanently,
    errorMessage,
    retryNow,
    startRetryFlow,
    resetRetryState,
    checkNetworkAndLoad,
  } = useNetworkRetry({
    fetchFn: loadDataFn,
    countdownSeconds: 5,
    maxRetries: 3,
  });

  useEffect(() => {
    setAvailableReferralBalance(walletBalance);
  }, [walletBalance, setAvailableReferralBalance])

  // Load products, addresses, and user data
  // Re-run when isAuthenticated changes to fetch addresses after login
  useEffect(() => {
    loadData();
    loadUserData();
  }, [isAuthenticated]);

  /**
   * Guest Order Flow Restoration
   * When a guest returns from authentication with step parameter,
   * restore their previous order state from AsyncStorage
   */
  useEffect(() => {
    const restoreGuestOrderState = async () => {
      // Only proceed if:
      // 1. User is now authenticated (just came back from login)
      // 2. There's a step parameter in the URL
      // 3. There's saved guest order state
      if (!isAuthenticated || !stepParam) {
        return;
      }

      try {
        // Check if there's saved guest order state
        const hasSavedState = await hasGuestOrderState();
        if (!hasSavedState) {
          console.log('📦 No saved guest order state found');
          // Still navigate to the requested step
          const targetStep = parseInt(stepParam, 10);
          if (targetStep >= 1 && targetStep <= 4) {
            setCurrentStep(targetStep);
          }
          return;
        }

        // Load the saved state
        const savedState = await loadGuestOrderState();
        if (!savedState) {
          console.log('📦 Guest order state expired or invalid');
          return;
        }

        console.log('📦 Restoring guest order state:', {
          itemCount: savedState.items?.length || 0,
          date: savedState.selectedDate,
          time: savedState.selectedTime,
          step: stepParam,
        });

        // Restore items to Zustand store
        if (savedState.items && savedState.items.length > 0) {
          setItems(savedState.items);
        }

        // Restore date/time selections
        if (savedState.selectedDate) {
          setSelectedDate(savedState.selectedDate);
        }
        if (savedState.selectedTime) {
          setSelectedTime(savedState.selectedTime);
        }

        // Set the step from URL parameter
        const targetStep = parseInt(stepParam, 10);
        if (targetStep >= 1 && targetStep <= 4) {
          setCurrentStep(targetStep);
          }

        // Clear the saved state after restoration
        await clearGuestOrderState();
        console.log('✅ Guest order state restored and cleared');

        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: 'Your order has been restored. Please review and confirm.',
        });
      } catch (error) {
        console.error('Error restoring guest order state:', error);
      }
    };

    restoreGuestOrderState();
  }, [isAuthenticated, stepParam, setItems]);


  // Tutorial system: Measure element positions when tutorial is active
  useEffect(() => {
    if (currentScreen === 'sell') {
      // Small delay to ensure elements are rendered
      const timer = setTimeout(() => {
        // Measure step indicator
        stepIndicatorRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setStepTarget('sell-step-indicator', { x: pageX, y: pageY, width, height });
        });

        // Measure item selection (first category section)
        itemSelectionRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setStepTarget('sell-item-selection', { x: pageX, y: pageY, width, height });
        });

        // Measure quantity controls (if items are selected)
        if (selectedItems.length > 0) {
          quantityControlsRef.current?.measure((x, y, width, height, pageX, pageY) => {
            setStepTarget('sell-quantity', { x: pageX, y: pageY, width, height });
          });
        }

        // Measure date/time selection
        dateTimeRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setStepTarget('sell-datetime', { x: pageX, y: pageY, width, height });
        });

        // Measure address section
        addressRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setStepTarget('sell-address', { x: pageX, y: pageY, width, height });
        });

        // Measure summary section
        summaryRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setStepTarget('sell-summary', { x: pageX, y: pageY, width, height });
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, currentStep, selectedItems.length, setStepTarget]);

  const loadUserData = async () => {
    try {
      const user = await AuthService.getUser();
      if (user) {
        setContactForm(prev => {
          const updates: Partial<typeof prev> = {};
          if (user.name) updates.name = user.name;
          if (user.phone_number) {
            // Strip all non-digits, then take the last 10 digits
            // handles formats: "9876543210", "+919876543210", "919876543210"
            const digitsOnly = user.phone_number.replace(/\D/g, '');
            updates.mobile = digitsOnly.slice(-10);
          }
          return { ...prev, ...updates };
        });
      }
    } catch (error) {
      console.log('Could not load user data:', error);
    }
  };


  const loadData = async () => {
    const isConnected = await checkNetworkAndLoad();
    if (isConnected) {
      try {
        await loadDataFn();
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to load data';
        const isNetworkError =
          errorMsg.toLowerCase().includes('network') ||
          errorMsg.toLowerCase().includes('internet') ||
          errorMsg.toLowerCase().includes('connection');

        if (isNetworkError) {
          startRetryFlow(errorMsg);
        }
        // Non-network errors are logged but not shown as disruptive toasts
        console.log('Load data error:', errorMsg);
      }
    }
  };

  const compressImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      return uri;
    }
  };

  const pickImage = async () => {
    const MAX_IMAGES = 5;

    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert(
        'Limit Reached',
        `You can upload a maximum of ${MAX_IMAGES} images per order.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: MAX_IMAGES - selectedImages.length, // Android-safe
    });

    if (!result.canceled) {
      const compressedUris: string[] = [];

      for (const asset of result.assets) {
        const compressedUri = await compressImage(asset.uri);
        compressedUris.push(compressedUri);
      }

      setSelectedImages(prev => [...prev, ...compressedUris]);

      Toast.show({
        type: 'success',
        text1: 'Images Added',
        text2: `${compressedUris.length} images ready`,
      });
    }
  };

  const removeImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(imageUri => imageUri !== uri));
  };

  const openQuantityModal = (product: ProductSummary) => {
    setSelectedProduct(product);
    const existingItem = selectedItems.find(i => i.id === product.id);
    setTempQuantity(existingItem ? existingItem.quantity.toString() : '1');
    setShowQuantityModal(true);
  };

  const closeQuantityModal = () => {
    setShowQuantityModal(false);
    setSelectedProduct(null);
    setTempQuantity('1');
  };

  const handleQuantityConfirm = () => {
    if (!selectedProduct) return;

    const quantity = parseFloat(tempQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Quantity',
        text2: 'Please enter a valid quantity',
      });
      return;
    }

    const rate = selectedProduct.min_rate; // Use minimum rate for estimated value
    const existingItem = selectedItems.find(i => i.id === selectedProduct.id);

    if (existingItem) {
      updateItemQuantity(selectedProduct.id, quantity);
    } else {
      addItemToStore({
        id: selectedProduct.id,
        name: selectedProduct.name,
        rate,
        unit: selectedProduct.unit,
        quantity,
        image: getImageForProduct(selectedProduct)
      });
    }

    closeQuantityModal();
  };

  const incrementQuantity = () => {
    const current = parseFloat(tempQuantity) || 0;
    setTempQuantity((current + 1).toString());
  };

  const decrementQuantity = () => {
    const current = parseFloat(tempQuantity) || 0;
    if (current > 1) {
      setTempQuantity((current - 1).toString());
    }
  };

  const updateQuantity = (id: number, change: number) => {
    const item = selectedItems.find(i => i.id === id);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        removeItemFromStore(id);
      } else {
        updateItemQuantity(id, newQuantity);
      }
    }
  };

  const removeItem = (id: number) => {
    removeItemFromStore(id);
  };

  const getTotalAmount = () => {
    const total = selectedItems.reduce((sum, item) => {
      const itemTotal = item.rate * item.quantity;
      console.log(`${item.name}: ${item.rate} × ${item.quantity} = ${itemTotal}`);
      return sum + itemTotal;
    }, 0);
    console.log(`Total Amount: ${total}`);
    return total;
  };

  // Calculate referral discount - use full wallet balance as bonus
  const getReferralDiscount = () => {
    if (!useReferralBalance || walletBalance === 0) return 0;
    // Return full wallet balance as bonus (not capped at order amount)
    return walletBalance;
  };

  // Calculate final amount (total + referral bonus)
  const getFinalAmount = () => {
    return getTotalAmount() + getReferralDiscount();
  };

  const getFormattedAddress = () => {
    const { title, addressLine, landmark, city, pinCode } = addressForm;
    let address = '';
    if (addressLine) address += addressLine;
    if (landmark) address += landmark ? `, ${landmark}` : '';
    if (city) address += city ? `, ${city}` : '';
    if (pinCode) address += pinCode ? ` - ${pinCode}` : '';
    return address || 'Address not provided';
  };

  const getSelectedSavedAddress = () => {
    if (!selectedAddressId) return null;
    return addresses.find(addr => addr.id === selectedAddressId);
  };

  const getDisplayAddress = () => {
    if (useNewAddress) {
      return getFormattedAddress();
    } else {
      const savedAddress = getSelectedSavedAddress();
      if (savedAddress) {
        return `${savedAddress.street}, ${savedAddress.city} - ${savedAddress.pincode}`;
      }
      return 'No address selected';
    }
  };

  const getAddressTitle = () => {
    if (useNewAddress) {
      return addressForm.title;
    } else {
      const savedAddress = getSelectedSavedAddress();
      return savedAddress?.name || '';
    }
  };

  // Breakdown sidebar functions
  const openBreakdownSidebar = () => {
    setShowBreakdownSidebar(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeBreakdownSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowBreakdownSidebar(false));
  };

  const validateMobileNumber = (mobile: string): boolean => {
    const mobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return mobileRegex.test(mobile.replace(/\s/g, ''));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (currentStep === 1 && selectedItems.length === 0) {
      newErrors.items = '📦 Please select at least one item to sell';
    }

    if (currentStep === 2 && (!selectedDate || !selectedTime)) {
      newErrors.schedule = '📅 Please select date and time for pickup';
    }

    if (currentStep === 3) {
      if (useNewAddress) {
        if (!addressForm.title.trim()) newErrors.title = '🏠 Address title is required';
        if (!addressForm.addressLine.trim()) newErrors.addressLine = '📍 Address line is required';
        if (!addressForm.city.trim()) newErrors.city = '🏙️ City is required';
        if (!addressForm.pinCode.trim()) newErrors.pinCode = '📮 PIN code is required';
        else if (!/^\d{6}$/.test(addressForm.pinCode)) newErrors.pinCode = '📮 PIN code must be 6 digits';
      } else {
        if (!selectedAddressId) {
          newErrors.savedAddress = '📍 Please select a saved address';
        }
      }

      if (!contactForm.name.trim()) newErrors.name = '👤 Name is required';
      if (!contactForm.mobile.trim()) newErrors.mobile = '📱 Mobile number is required';
      else if (!validateMobileNumber(contactForm.mobile)) {
        newErrors.mobile = '📱 Please enter a valid 10-digit mobile number';
      }

      if (selectedImages.length === 0) {
        newErrors.images = '📸 Please upload at least one photo of your scrap';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setCurrentStep(1);

    setSelectedDate('');
    setSelectedTime('');
    setAddressForm({
      title: '',
      addressLine: '',
      landmark: '',
      city: '',
      pinCode: ''
    });
    setContactForm({
      name: '',
      mobile: ''
    });
    setUseNewAddress(true);
    setErrors({});
    setSelectedImages([]);
    setNotes('');
    setRewardInputValue('');
    setRewardApplied(false);
    resetOrder();
  };

  const handleNext = async () => {
    setErrors({});

    setTimeout(async () => {
      if (!validateForm()) {
        return;
      }

      /**
       * AUTH GATE: Step 2 → Step 3 Transition
       * Guests can complete Steps 1-2 (item selection, scheduling),
       * but must authenticate before proceeding to Step 3 (address/confirmation)
       * 
       * IMPORTANT: Only redirect if auth is NOT loading and user is confirmed guest
       */
      if (currentStep === 2 && isGuest && !isAuthLoading) {
        try {
          // Prepare order state to save
          const orderState: GuestOrderState = {
            items: selectedItems.map(item => ({
              id: item.id,
              name: item.name,
              rate: item.rate,
              unit: item.unit,
              quantity: item.quantity,
              image: item.image,
            })),
            selectedDate,
            selectedTime,
            currentStep: 3, // They should return to step 3
          };

          // Save order state to AsyncStorage
          await saveGuestOrderState(orderState);
          console.log('📦 Guest order state saved, redirecting to auth');

          // Show informative toast
          Toast.show({
            type: 'info',
            text1: 'Sign in required',
            text2: 'Please sign in to complete your order. Your cart has been saved!',
            visibilityTime: 3000,
          });

          // Redirect to login with returnTo parameter
          // The returnTo URL includes step=3 so we know to restore state
          const returnTo = encodeURIComponent('/(tabs)/sell?step=3');
          router.push(`/(auth)/login?returnTo=${returnTo}`);
          return;
        } catch (error) {
          console.error('Error saving guest order state:', error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Unable to save your order. Please try again.',
          });
          return;
        }
      }

      // Normal step progression
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleOrderSubmission();
      }
    }, 0);
  };

  const handlePrevious = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOrderSubmission = async () => {
    setSubmittingOrder(true);
    try {
      const itemsPayload = selectedItems.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
      }));

      let addressId = selectedAddressId;

      if (useNewAddress) {
        const newAddr = await AuthService.createAddress({
          name: addressForm.title,
          phone_number: contactForm.mobile,
          room_number: '',
          street: addressForm.addressLine,
          area: addressForm.landmark || '',
          city: addressForm.city,
          state: '',
          country: 'India',
          pincode: parseInt(addressForm.pinCode, 10) || 0,
          delivery_suggestion: notes || ''
        });
        addressId = newAddr.id;
      }

      // Calculate estimated value to send
      const orderEstimatedValue = estimatedValue;
      const orderReferralBonus = useReferralBonus && rewardApplied ? customReferralAmount : 0;
      const orderTotalPayout = useReferralBonus ? totalPayout : estimatedValue;

      const result = await AuthService.createOrder(
        itemsPayload,
        addressId || undefined,
        selectedImages,
        orderEstimatedValue,
        orderReferralBonus > 0 ? orderReferralBonus : undefined
      );

      const orderId = result.order_id;
      const orderNumber = result.order_no;

      if (orderReferralBonus > 0) {
        Toast.show({
          type: 'success',
          text1: 'Rewards Credits Applied',
          text2: `₹${Math.round(orderReferralBonus)} will be added to your payout on completion`
        });
      }

      // Store order ID for feedback
      setLastOrderId(orderId);

      Toast.show({
        type: 'success',
        text1: 'Booking confirmed',
        text2: `Order ${orderNumber} is live. We are finding your nearest vendor now.`,
      });

      resetForm();
      router.replace(`/tracking/${orderId}/search` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Group products by category for display
  const groupedProducts = products.reduce((acc, product) => {
    const categoryId = product.category;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(product);
    return acc;
  }, {} as Record<number, ProductSummary[]>);

  // Helper to get category name by ID
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Items';
  };

  const renderStepIndicator = () => (
    <View ref={stepIndicatorRef} style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            {currentStep >= step ? (
              <LinearGradient
                colors={isDark ? ['#22c55e', '#16a34a'] : ['#16a34a', '#15803d']}
                style={styles.stepGradient}
              >
                <Text style={styles.stepNumberActive}>
                  {step}
                </Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.stepNumber, { color: colors.textSecondary }]}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Items to Sell</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Choose the scrap materials you want to sell</Text>

      {loadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading products...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.categoriesContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {Object.entries(groupedProducts)
            .filter(([categoryId]) => {
              if (!selectedLandingCategory) return true;
              const categoryName = getCategoryName(Number(categoryId));
              return matchesScrapCategory(categoryName, selectedLandingCategory);
            })
            .map(([categoryId, categoryProducts], index) => (
            <View
              key={categoryId}
              ref={index === 0 ? itemSelectionRef : null}
              style={styles.categorySection}
            >
              <LinearGradient
                colors={isDark ? ['#22c55e', '#16a34a'] : ['#16a34a', '#15803d']}
                style={styles.categoryHeaderSell}
              >
                <Text style={styles.categoryTitleSell}>
                  {getCategoryName(Number(categoryId))}
                </Text>
              </LinearGradient>

              <View style={styles.categoryItems}>
                {categoryProducts.map((product) => {
                  const productImage = getImageForProduct(product);
                  const fallbackImage = getFallbackImageForProduct(product.name);
                  const selectedItem = selectedItems.find(item => item.id === product.id);
                  const isSelected = !!selectedItem;

                  return (
                    <View
                      key={product.id}
                      style={[
                        styles.itemCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderColor: colors.primary, borderWidth: 2 }
                      ]}
                    >
                      <View style={styles.itemLeft}>
                        {productImage && (
                          <RemoteImage
                            source={productImage}
                            fallback={fallbackImage}
                            style={styles.itemIconImage}
                            showLoadingIndicator={false}
                          />
                        )}
                        <View style={styles.itemInfo}>
                          <Text
                            style={[styles.itemName, { color: colors.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {product.name}
                          </Text>
                          <Text style={[styles.itemRate, { color: colors.primary }]}>
                            ₹{product.min_rate}-{product.max_rate}/{product.unit}
                          </Text>
                          <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                            {product.description}
                          </Text>
                        </View>
                      </View>

                      {isSelected ? (
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            style={[styles.quantityBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderColor: colors.primary }]}
                            onPress={() => openQuantityModal(product)}
                          >
                            <Text style={[styles.quantityBadgeText, { color: colors.primary }]}>
                              Selected: {selectedItem.quantity} {product.unit}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.removeButtonSmall, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}
                            onPress={() => removeItem(product.id)}
                          >
                            <Trash2 size={16} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: colors.primary }]}
                          onPress={() => openQuantityModal(product)}
                        >
                          <Plus size={16} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {selectedItems.length > 0 && (
        <View style={styles.selectedItems}>
          <Text style={[styles.selectedItemsTitle, { color: colors.text }]}>Selected Items({selectedItems.length})</Text>
          {selectedItems.map((item, index) => {
            const fallbackImage = getFallbackImageForProduct(item.name);
            return (
              <View key={item.id} style={[styles.selectedItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.selectedItemLeft}>
                  {item.image && (
                    <RemoteImage
                      source={item.image}
                      fallback={fallbackImage}
                      style={styles.selectedItemIconImage}
                      showLoadingIndicator={false}
                    />
                  )}
                  <View>
                    <Text style={[styles.selectedItemName, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode='tail'>{item.name}</Text>
                    <Text style={styles.selectedItemRate}>
                      ₹{Math.round(item.rate)}/{item.unit}
                    </Text>
                  </View>
                </View>
                <View
                  ref={index === 0 ? quantityControlsRef : null}
                  style={styles.quantityControls}
                >
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, -1)}
                  >
                    <Minus size={14} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={{ color: colors.primary }}>{item.quantity}{item.unit}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, 1)}
                  >
                    <Plus size={14} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(item.id)}
                  >
                    <Trash2 size={14} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {errors.items && (
        <Text style={styles.errorTextCentered}>{errors.items}</Text>
      )}
    </View>
  );

  // Clean up selectedDate/selectedTime when available slots change.
  // This must be a useEffect (not inline in renderStep2) to avoid setState during render.
  useEffect(() => {
    if (!selectedDate) return;
    const availableSlots = getAvailableTimeSlots(selectedDate);
    if (availableSlots.length === 0) {
      setSelectedDate('');
      setSelectedTime('');
      return;
    }
    if (selectedTime && !availableSlots.find(s => s.label === selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedDate, selectedTime]);

  const renderStep2 = () => {
    const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

    return (
      <View style={styles.stepContent}>
        {/* Header */}
        <View style={styles.step2Header}>
          <View style={[styles.step2IconWrapper, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7' }]}>
            <Calendar size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, marginBottom: 2 }]}>Schedule Pickup</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary, marginBottom: 0 }]}>Choose your preferred date and time</Text>
          </View>
        </View>

        {/* Date Section */}
        <View ref={dateTimeRef} style={styles.dateSection}>
          <View style={styles.sectionLabelRow}>
            <Calendar size={16} color={colors.primary} />
            <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>Select Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              // Use IST timezone for all date labels so they match getISTHour-based comparisons
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
              const day = parseInt(date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' }), 10);
              const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
              const dateStr = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Kolkata',
              });
              const isToday = i === 0;
              const isSelected = selectedDate === dateStr;

              // Skip dates with no available time slots (e.g. today when all slots have passed)
              if (getAvailableTimeSlots(dateStr).length === 0) return null;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dateCardPro,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[
                    styles.dateWeekday,
                    { color: colors.textSecondary },
                    isSelected && { color: 'rgba(255,255,255,0.8)' }
                  ]}>
                    {isToday ? 'Today' : weekday}
                  </Text>
                  <Text style={[
                    styles.dateDay,
                    { color: colors.text },
                    isSelected && { color: '#fff' }
                  ]}>
                    {day}
                  </Text>
                  <Text style={[
                    styles.dateMonth,
                    { color: colors.textSecondary },
                    isSelected && { color: 'rgba(255,255,255,0.8)' }
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slots Section */}
        {selectedDate ? (
          <View style={styles.timeSection}>
            <View style={styles.sectionLabelRow}>
              <Clock size={16} color={colors.primary} />
              <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>Select Time Slot</Text>
            </View>
            {availableSlots.length > 0 ? (
              <View style={styles.timeSlotsGrid}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.label}
                    style={[
                      styles.timeSlotPro,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedTime === slot.label && { backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedTime(slot.label)}
                  >
                    <View style={styles.timeSlotInner}>
                      <Clock size={14} color={selectedTime === slot.label ? colors.primary : colors.textSecondary} />
                      <Text style={[
                        styles.timeSlotText,
                        { color: colors.textSecondary },
                        selectedTime === slot.label && { color: colors.primary, fontWeight: '600' }
                      ]}>
                        {slot.label}
                      </Text>
                    </View>
                    {selectedTime === slot.label && (
                      <View style={[styles.timeSlotCheck, { backgroundColor: colors.primary }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.noSlotsContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', borderColor: '#f59e0b' }]}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={[styles.noSlotsText, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                  No time slots available for today. Please select a different date.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.selectDatePrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={32} color={colors.textSecondary} />
            <Text style={[styles.selectDatePromptText, { color: colors.textSecondary }]}>
              Please select a date first to view available time slots
            </Text>
          </View>
        )}

        {/* Selection Summary */}
        {selectedDate && selectedTime ? (
          <View style={[styles.scheduleSummary, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4', borderColor: colors.primary }]}>
            <Check size={18} color={colors.primary} />
            <View style={styles.scheduleSummaryText}>
              <Text style={[styles.scheduleSummaryLabel, { color: colors.primary }]}>Pickup Scheduled</Text>
              <Text style={[styles.scheduleSummaryValue, { color: colors.text }]}>{selectedDate} • {selectedTime}</Text>
            </View>
          </View>
        ) : null}

        {errors.schedule && (
          <Text style={styles.errorTextCentered}>{errors.schedule}</Text>
        )}
      </View>
    );
  };

  const getProductsForLandingCategory = (categoryKey: ScrapCategoryKey): ProductSummary[] => {
    return products.filter((product) => {
      const categoryName = getCategoryName(product.category);
      return matchesScrapCategory(categoryName, categoryKey);
    });
  };

  const renderTypesLanding = () => (
    <View style={[styles.typesRoot, { backgroundColor: colors.background }]}> 
      <LinearGradient
        colors={isDark ? ['#0b7a31', '#2e8f4d', 'transparent'] : ['#0d7f34', '#5aa96e', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.typesHeader}
      >
        <TouchableOpacity style={styles.typesBackButton} onPress={() => router.back()}>
          <ArrowLeft size={30} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.typesHeaderTitle}>Types of Scraps</Text>
      </LinearGradient>

      <View style={styles.typesGrid}>
        {SCRAP_CATEGORY_CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={styles.typesCardWrap}
            activeOpacity={0.86}
            onPress={() => {
              setSelectedLandingCategory(card.key);
              setShowTypesLanding(false);
            }}
          >
            <View style={[styles.typesCard, { backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
              <Image source={card.image} style={styles.typesCardImage} resizeMode="contain" />
            </View>
            <Text style={[styles.typesCardLabel, { color: colors.text }]}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategoryShowcase = (categoryKey: ScrapCategoryKey) => {
    const detail = SCRAP_CATEGORY_DETAILS[categoryKey];
    const categoryProducts = getProductsForLandingCategory(categoryKey);

    return (
      <View
        style={[
          styles.categoryShowcaseRoot,
          { backgroundColor: detail.lightBackground },
        ]}
      >
        <View style={styles.categoryShowcaseHeaderRow}>
          <TouchableOpacity
            style={styles.categoryShowcaseBackButton}
            onPress={() => {
              setShowTypesLanding(true);
              setSelectedLandingCategory(null);
            }}
          >
            <ArrowLeft size={24} color={isDark ? '#f3f4f6' : '#111827'} />
          </TouchableOpacity>
          <Text style={[styles.categoryShowcaseTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>{detail.title}</Text>
        </View>

        <View style={styles.categoryShowcaseScrollContent}>
          <Image source={detail.headImage} style={styles.categoryShowcaseHeadImage} resizeMode="contain" />

          <View style={styles.categoryShowcaseListWrap}>
            <Text style={[styles.categoryShowcaseListTitle, { color: isDark ? '#f3f4f6' : '#111827' }]}>
              {detail.sectionTitle}
            </Text>

            {categoryProducts.map((product) => {
              const productImage = getImageForProduct(product);
              const fallbackImage = getFallbackImageForProduct(product.name);
              const selectedItem = selectedItems.find(item => item.id === product.id);
              return (
                <View key={product.id} style={[styles.categoryShowcaseItemRow, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
                  <View style={styles.categoryShowcaseItemLeft}>
                    {productImage ? (
                      <RemoteImage source={productImage} fallback={fallbackImage} style={styles.categoryShowcaseItemImage} showLoadingIndicator={false} />
                    ) : (
                      <Image source={fallbackImage} style={styles.categoryShowcaseItemImage} resizeMode="cover" />
                    )}
                    <View style={styles.categoryShowcaseItemTextWrap}>
                      <Text style={[styles.categoryShowcaseItemName, { color: isDark ? '#f9fafb' : '#111827' }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.categoryShowcaseItemDesc, { color: isDark ? '#d1d5db' : '#6b7280' }]} numberOfLines={2}>
                        {product.description || `${product.name} scrap`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryShowcaseItemRight}>
                    <Text style={[styles.categoryShowcaseRate, { color: isDark ? '#f3f4f6' : '#2f2f2f' }]}>
                      Rs {product.min_rate} - {product.max_rate}/{product.unit}
                    </Text>
                    {selectedItem && (
                      <Text style={[styles.categoryShowcaseSelectedQty, { color: detail.sellBtn }]}>
                        Selected: {selectedItem.quantity} {product.unit}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.categoryShowcaseSellBtn, { backgroundColor: detail.sellBtn }]}
                      onPress={() => openQuantityModal(product)}
                    >
                      <Text style={styles.categoryShowcaseSellBtnText}>Sell</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <Text style={[styles.categoryShowcaseRateHint, { color: isDark ? '#d1d5db' : '#5b5b5b' }]}>Rates last updated: 10 February 2026</Text>
            <Image source={detail.contactImage} style={styles.categoryShowcaseContactImage} resizeMode="cover" />
          </View>
        </View>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      {/* Header */}
      <View style={styles.step2Header}>
        <View style={[styles.step2IconWrapper, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe' }]}>
          <MapPin size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={[styles.stepTitle, { color: colors.text, marginBottom: 2 }]}>Contact & Address</Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary, marginBottom: 0 }]}>Provide your contact details and pickup address</Text>
        </View>
      </View>

      {/* Contact Information */}
      <View
        ref={addressRef}
        style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.contactHeader}>
          <User size={20} color={colors.text} />
          <Text style={[styles.contactHeaderTitle, { color: colors.text }]}>Contact Information</Text>
        </View>

        <View style={styles.contactForm}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, errors.name && styles.formInputError]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
              value={contactForm.name}
              onChangeText={(text) => {
                setContactForm(prev => ({ ...prev, name: text }));
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              autoFocus={false}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Mobile Number <Text style={styles.required}>*</Text></Text>
            <View style={[styles.mobileInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Phone size={16} color={colors.textSecondary} style={styles.mobileIcon} />
              <TextInput
                style={[styles.mobileInput, { color: colors.text }, errors.mobile && styles.formInputError]}
                placeholder="Enter your mobile number"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.mobile}
                onChangeText={(text) => {
                  setContactForm(prev => ({ ...prev, mobile: text }));
                  if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }));
                }}
                keyboardType="phone-pad"
                maxLength={15}
                autoFocus={false}
                selectTextOnFocus={false}
              />
            </View>
            {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
          </View>
        </View>
      </View>

      <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.addressHeader}>
          <MapPin size={20} color={colors.text} />
          <Text style={[styles.addressHeaderTitle, { color: colors.text }]}>Select or Add Address</Text>
        </View>

        <View style={[styles.addressTabs, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}>
          <TouchableOpacity
            style={[
              styles.addressTab,
              useNewAddress && {
                backgroundColor: isDark ? '#374151' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }
            ]}
            onPress={() => {
              setUseNewAddress(true);
              if (errors.savedAddress) {
                setErrors(prev => ({ ...prev, savedAddress: '' }));
              }
            }}
          >
            <Text style={[
              styles.addressTabText,
              { color: isDark ? '#9ca3af' : '#6b7280' },
              useNewAddress && { color: isDark ? '#f9fafb' : '#111827', fontWeight: '600' }
            ]}>
              Add New Address
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addressTab,
              !useNewAddress && {
                backgroundColor: isDark ? '#374151' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }
            ]}
            onPress={() => {
              setUseNewAddress(false);
              const addressErrors = ['title', 'addressLine', 'city', 'pinCode'];
              if (addressErrors.some(key => errors[key])) {
                const newErrors = { ...errors };
                addressErrors.forEach(key => delete newErrors[key]);
                setErrors(newErrors);
              }
            }}
          >
            <Text style={[
              styles.addressTabText,
              { color: isDark ? '#9ca3af' : '#6b7280' },
              !useNewAddress && { color: isDark ? '#f9fafb' : '#111827', fontWeight: '600' }
            ]}>
              Use Saved Address
            </Text>
          </TouchableOpacity>
        </View>

        {useNewAddress ? (
          <View style={styles.addressForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Address Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, errors.title && styles.formInputError]}
                placeholder="e.g., Home, Office"
                placeholderTextColor={colors.textSecondary}
                value={addressForm.title}
                onChangeText={(text) => {
                  setAddressForm(prev => ({ ...prev, title: text }));
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Address Line <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, errors.addressLine && styles.formInputError]}
                placeholder="House/Flat no, Street name"
                placeholderTextColor={colors.textSecondary}
                value={addressForm.addressLine}
                onChangeText={(text) => {
                  setAddressForm(prev => ({ ...prev, addressLine: text }));
                  if (errors.addressLine) setErrors(prev => ({ ...prev, addressLine: '' }));
                }}
              />
              {errors.addressLine && <Text style={styles.errorText}>{errors.addressLine}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Area/Landmark</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Nearby landmark or area"
                placeholderTextColor={colors.textSecondary}
                value={addressForm.landmark}
                onChangeText={(text) => setAddressForm(prev => ({ ...prev, landmark: text }))}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>City <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, errors.city && styles.formInputError]}
                  placeholder="City"
                  placeholderTextColor={colors.textSecondary}
                  value={addressForm.city}
                  onChangeText={(text) => {
                    setAddressForm(prev => ({ ...prev, city: text }));
                    if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                  }}
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>PIN Code <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, errors.pinCode && styles.formInputError]}
                  placeholder="123456"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={6}
                  value={addressForm.pinCode}
                  onChangeText={(text) => {
                    setAddressForm(prev => ({ ...prev, pinCode: text }));
                    if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
                  }}
                />
                {errors.pinCode && <Text style={styles.errorText}>{errors.pinCode}</Text>}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.savedAddresses}>
            {addresses.length > 0 ? (
              addresses.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.savedAddressCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedAddressId === address.id && { backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderColor: colors.primary }
                  ]}
                  onPress={() => setSelectedAddressId(address.id)}
                >
                  <View style={styles.savedAddressInfo}>
                    <Text style={[styles.savedAddressTitle, { color: colors.text }]}>
                      {address.name}
                    </Text>
                    <Text style={[styles.savedAddressText, { color: colors.textSecondary }]}>
                      {address.street}, {address.city} - {address.pincode}
                    </Text>
                  </View>
                  <View style={[styles.savedAddressRadio, { borderColor: colors.primary }]}>
                    {selectedAddressId === address.id && (
                      <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.noSavedAddress, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MapPin size={48} color={colors.border} />
                <Text style={[styles.noSavedAddressText, { color: colors.textSecondary }]}>No saved addresses yet</Text>
                <Text style={[styles.noSavedAddressSubtext, { color: colors.textTertiary }]}>
                  Please add a new address to continue
                </Text>
              </View>
            )}
          </View>
        )}
        {errors.savedAddress && !useNewAddress && (
          <Text style={styles.errorText}>{errors.savedAddress}</Text>
        )}
      </View>

      {/* Photo Upload Section */}
      <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.photoHeader}>
          <Camera size={20} color={colors.text} />
          <Text style={[styles.photoHeaderTitle, { color: colors.text }]}>Upload Photos</Text>
        </View>
        <Text style={[styles.photoDescription, { color: colors.textSecondary }]}>
          Upload at least one photo of your scrap for accurate pricing.
        </Text>
        {errors.images && (
          <Text style={styles.errorText}>{errors.images}</Text>
        )}

        <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
          <Camera size={24} color={colors.textSecondary} />
          <Text style={[styles.photoButtonText, { color: colors.text }]}>Add Photos</Text>
          <Text style={[styles.photoButtonSubtext, { color: colors.textSecondary }]}>Max 5 images </Text>
        </TouchableOpacity>

        {selectedImages.length > 0 && (
          <View style={styles.selectedImagesContainer}>
            <Text style={[styles.selectedImagesTitle, { color: colors.text }]}>Selected Photos ({selectedImages.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(uri)}
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Order Summary</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Review your pickup details</Text>

      <View
        ref={summaryRef}
        style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Items</Text>
        {selectedItems.map((item) => {
          const fallbackImage = getFallbackImageForProduct(item.name);
          return (
            <View key={item.id} style={styles.summaryItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                {item.image && (
                  <RemoteImage
                    source={item.image}
                    fallback={fallbackImage}
                    style={styles.summaryItemIconImage}
                    showLoadingIndicator={false}
                  />
                )}
                <Text style={[styles.summaryItemName, { color: colors.text }]} numberOfLines={2}>
                  {item.name} ({item.quantity}{item.unit})
                </Text>
              </View>
              <Text style={[styles.summaryItemAmount, { color: colors.primary }]}>
                ₹{Math.round(item.rate * item.quantity)}
              </Text>
            </View>
          );
        })}
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryTotal}>
          <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>Estimated Total</Text>
          <Text style={[styles.summaryTotalAmount, { color: colors.primary }]}>₹{Math.round(getTotalAmount())}</Text>
        </View>
        {deliveryCharge > 0 && (
          <View style={[styles.summaryTotal, { marginTop: 4 }]}>
            <Text style={[styles.summaryTotalLabel, { color: '#f59e0b', fontSize: 13 }]}>Delivery Charge</Text>
            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600', fontFamily: 'Inter-SemiBold' }}>-₹{deliveryCharge}</Text>
          </View>
        )}
        <TouchableOpacity 
          style={{ marginTop: 10, alignSelf: 'flex-end' }}
          onPress={openBreakdownSidebar}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter-SemiBold' }}>View Full Breakdown →</Text>
        </TouchableOpacity>
      </View>
      {walletBalance > 0 && (
        <View style={[styles.referralCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.primary : '#dcfce7' }]}>
          <View style={styles.referralHeader}>
            <View style={styles.referralHeaderLeft}>
              <View style={[styles.referralIconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7' }]}>
                <Wallet size={20} color={estimatedValue >= 400 ? colors.primary : "#f59e0b"} />
              </View>
              <View>
                <Text style={[styles.referralTitle, { color: colors.text }]}>Rewards Credits</Text>
                <Text style={[
                  styles.referralBalance,
                  { color: colors.primary },
                  estimatedValue < 400 && { color: '#f59e0b' }
                ]}>
                  ₹{walletBalance.toFixed(2)} available
                </Text>
              </View>
            </View>
            {estimatedValue >= 400 ? (
              <TouchableOpacity
                style={[
                  styles.referralToggle,
                  useReferralBonus && styles.referralToggleActive
                ]}
                onPress={() => {
                  if (useReferralBonus) {
                    // Turning off — reset everything
                    toggleReferralBonus();
                    setRewardInputValue('');
                    setRewardApplied(false);
                    setCustomReferralAmount(0);
                  } else {
                    // Turning on
                    toggleReferralBonus();
                  }
                }}
              >
                <View style={[
                  styles.referralToggleCircle,
                  useReferralBonus && styles.referralToggleCircleActive
                ]} />
              </TouchableOpacity>
            ) : (
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>🔒</Text>
              </View>
            )}
          </View>

          {estimatedValue >= 400 ? (
            useReferralBonus && (
              <View style={{ marginTop: 16 }}>
                {!rewardApplied ? (
                  <>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter-Regular', marginBottom: 10 }}>
                      Available Balance: <Text style={{ color: colors.primary, fontWeight: '600', fontFamily: 'Inter-SemiBold' }}>₹{walletBalance.toFixed(2)}</Text>
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <View style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark ? colors.border : '#e5e7eb',
                        paddingHorizontal: 14,
                        height: 48,
                      }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: 'Inter-Medium', marginRight: 4 }}>₹</Text>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 16,
                            fontFamily: 'Inter-Medium',
                            color: colors.text,
                            paddingVertical: 0,
                          }}
                          value={rewardInputValue}
                          onChangeText={(text) => {
                            // Allow only numbers and one decimal point
                            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                            setRewardInputValue(cleaned);
                          }}
                          placeholder={`Max ₹${walletBalance.toFixed(0)}`}
                          placeholderTextColor={colors.inputPlaceholder}
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            const parsed = parseFloat(rewardInputValue);
                            if (!isNaN(parsed) && parsed > 0 && parsed <= walletBalance) {
                              setCustomReferralAmount(parsed);
                              setRewardApplied(true);
                              Keyboard.dismiss();
                            }
                          }}
                        />
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary,
                          borderRadius: 12,
                          height: 48,
                          paddingHorizontal: 20,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: rewardInputValue.trim() === '' ? 0.5 : 1,
                        }}
                        disabled={rewardInputValue.trim() === ''}
                        onPress={() => {
                          const parsed = parseFloat(rewardInputValue);
                          if (isNaN(parsed) || parsed <= 0) {
                            Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount' });
                            return;
                          }
                          if (parsed > walletBalance) {
                            Toast.show({ type: 'error', text1: 'Exceeds Balance', text2: `Maximum available is ₹${walletBalance.toFixed(2)}` });
                            return;
                          }
                          setCustomReferralAmount(parsed);
                          setRewardApplied(true);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter-SemiBold' }}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={[styles.referralDiscountInfo, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderColor: isDark ? colors.primary : '#bbf7d0' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: colors.primary,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Check size={14} color="#fff" />
                        </View>
                        <Text style={[styles.referralDiscountText, { color: colors.primary, marginBottom: 0 }]}>
                          +₹{Math.round(customReferralAmount)} applied
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setRewardApplied(false);
                          setRewardInputValue(String(customReferralAmount));
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter-Medium' }}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.referralDiscountSubtext, { color: isDark ? '#dcfce7' : '#15803d', marginTop: 6 }]}>
                      Bonus will be added to your payout upon order completion
                    </Text>
                  </View>
                )}
              </View>
            )
          ) : (
            <View style={[styles.referralLockedInfo, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', borderColor: isDark ? '#f59e0b' : '#fde68a' }]}>
              <View style={[styles.referralLockedIconContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                <AlertCircle size={20} color="#f59e0b" />
              </View>
              <View style={styles.referralLockedTextContainer}>
                <Text style={[styles.referralLockedTitle, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                  Order Value Must Exceed ₹400
                </Text>
                <Text style={[styles.referralLockedSubtext, { color: isDark ? '#fcd34d' : '#b45309' }]}>
                  Add ₹{Math.round(400 - estimatedValue)} more in scrap to use your referral wallet
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Final Amount Summary */}
      {(useReferralBonus && referralBonus > 0) || deliveryCharge > 0 ? (
        <View style={[styles.finalAmountCard, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderColor: colors.primary }]}>
          <View style={styles.finalAmountRow}>
            <Text style={[styles.finalAmountLabel, { color: colors.textSecondary }]}>Estimated Value</Text>
            <Text style={[styles.finalAmountValue, { color: colors.textSecondary }]}>₹{Math.round(estimatedValue)}</Text>
          </View>
          {useReferralBonus && referralBonus > 0 && (
            <View style={styles.finalAmountRow}>
              <Text style={[styles.finalAmountLabelBonus, { color: colors.primary }]}>Referral Bonus</Text>
              <Text style={[styles.finalAmountValueBonus, { color: colors.primary }]}>+₹{Math.round(referralBonus)}</Text>
            </View>
          )}
          {deliveryCharge > 0 && (
            <View style={styles.finalAmountRow}>
              <Text style={[styles.finalAmountLabel, { color: '#ef4444' }]}>Delivery Charge</Text>
              <Text style={[styles.finalAmountValue, { color: '#ef4444' }]}>-₹{deliveryCharge}</Text>
            </View>
          )}
          <View style={[styles.finalAmountDivider, { backgroundColor: colors.primary }]} />
          <View style={styles.finalAmountRow}>
            <Text style={[styles.finalAmountLabelFinal, { color: colors.text }]}>Total Payout</Text>
            <Text style={[styles.finalAmountValueFinal, { color: colors.primary }]}>₹{Math.round(totalPayout)}</Text>
          </View>
          <Text style={[styles.finalAmountNote, { color: isDark ? '#dcfce7' : '#15803d', borderTopColor: isDark ? colors.primary : '#bbf7d0' }]}>
            💸 You will receive this amount from us
          </Text>
        </View>
      ) : null}

      {/* Pickup Details */}
      <View style={[styles.pickupDetailsCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.pickupDetailsHeader, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderBottomColor: isDark ? colors.primary : '#dcfce7' }]}>
          <View style={[styles.pickupDetailsIconWrapper, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7' }]}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <Text style={[styles.pickupDetailsTitle, { color: colors.text }]}>Pickup Details</Text>
        </View>

        <View style={styles.pickupDetailsContent}>
          <View style={styles.pickupDetailRow}>
            <View style={styles.pickupDetailLabel}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={[styles.pickupDetailLabelText, { color: colors.textSecondary }]}>Schedule</Text>
            </View>
            <View style={styles.pickupDetailValue}>
              <Text style={[styles.pickupDetailValueText, { color: colors.text }]}>{selectedDate}</Text>
              <View style={[styles.pickupTimeBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderColor: colors.primary }]}>
                <Text style={[styles.pickupTimeText, { color: colors.primary }]}>{selectedTime}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.pickupDetailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.pickupDetailRow}>
            <View style={styles.pickupDetailLabel}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={[styles.pickupDetailLabelText, { color: colors.textSecondary }]}>Location</Text>
            </View>
            <View style={styles.pickupDetailValue}>
              {getAddressTitle() && (
                <View style={[styles.addressTitleBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
                  <Text style={[styles.addressTitleText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>{getAddressTitle()}</Text>
                </View>
              )}
              <Text style={[styles.pickupAddressText, { color: colors.textSecondary }]}>
                {getDisplayAddress()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Contact Information</Text>
        <View style={styles.summaryDetail}>
          <User size={16} color={colors.textSecondary} />
          <Text style={[styles.summaryDetailText, { color: colors.textSecondary }]}>{contactForm.name}</Text>
        </View>
        <View style={styles.summaryDetail}>
          <Phone size={16} color={colors.textSecondary} />
          <Text style={[styles.summaryDetailText, { color: colors.textSecondary }]}>{contactForm.mobile}</Text>
        </View>
      </View>

      {/* Notes Section */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.notesTitleContainer}>
          <FileText size={18} color={colors.primary} />
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Notes (Optional)</Text>
        </View>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Add any special instructions or details for pickup..."
          placeholderTextColor={colors.inputPlaceholder}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
        <Text style={[styles.notesHint, { color: colors.textSecondary }]}>
          E.g., Gate code, parking instructions, specific location details, etc.
        </Text>
      </View>

      {/* Pickup Charges Section */}
      <View style={[styles.pickupChargesCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.pickupChargesHeader, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderBottomColor: isDark ? colors.primary : '#dcfce7' }]}>
          <View style={styles.pickupChargesTitleContainer}>
            <View style={[styles.pickupChargesIconWrapper, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7' }]}>
              <Scale size={22} color={colors.primary} />
            </View>
            <Text style={[styles.pickupChargesTitle, { color: colors.text }]}>Pickup Charges</Text>
          </View>
          <TouchableOpacity style={[styles.infoIconContainer, { backgroundColor: colors.card }]}>
            <AlertCircle size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.chargeOptionsContainer}>
          <View style={[styles.freeChargeCard, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', borderColor: colors.primary }]}>
            <View style={styles.chargeCardHeader}>
              <View style={[styles.freeTagLarge, { backgroundColor: colors.primary }]}>
                <Text style={styles.freeTagLargeText}>FREE</Text>
              </View>
            </View>
            <View style={styles.chargeConditionsContainer}>
              <View style={[styles.chargeCondition, { backgroundColor: colors.card }]}>
                <View style={[styles.conditionIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                  <Text style={styles.conditionIcon}>⚖️</Text>
                </View>
                <Text style={[styles.conditionText, { color: colors.textSecondary }]}>Weight above{'\n'}<Text style={[styles.conditionBold, { color: colors.text }]}>20 kg</Text></Text>
              </View>
              <View style={styles.orDividerContainer}>
                <View style={[styles.orDividerLine, { backgroundColor: colors.primary }]} />
                <Text style={[styles.orDividerText, { color: colors.primary }]}>OR</Text>
                <View style={[styles.orDividerLine, { backgroundColor: colors.primary }]} />
              </View>
              <View style={[styles.chargeCondition, { backgroundColor: colors.card }]}>
                <View style={[styles.conditionIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                  <Text style={styles.conditionIcon}>💰</Text>
                </View>
                <Text style={[styles.conditionText, { color: colors.textSecondary }]}>Amount above{'\n'}<Text style={[styles.conditionBold, { color: colors.text }]}>₹200</Text></Text>
              </View>
            </View>
          </View>

          <View style={[styles.paidChargeCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef9f0', borderColor: '#f59e0b' }]}>
            <View style={styles.chargeCardHeader}>
              <View style={styles.paidTagLarge}>
                <Text style={styles.paidTagLargeText}>₹30</Text>
              </View>
            </View>
            <View style={styles.chargeConditionsContainer}>
              <View style={[styles.chargeCondition, { backgroundColor: colors.card }]}>
                <View style={[styles.conditionIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                  <Text style={styles.conditionIcon}>⚖️</Text>
                </View>
                <Text style={[styles.conditionText, { color: colors.textSecondary }]}>Weight below{'\n'}<Text style={[styles.conditionBold, { color: colors.text }]}>20 kg</Text></Text>
              </View>
              <View style={styles.andDividerContainer}>
                <View style={styles.andDividerLine} />
                <Text style={styles.andDividerText}>AND</Text>
                <View style={styles.andDividerLine} />
              </View>
              <View style={[styles.chargeCondition, { backgroundColor: colors.card }]}>
                <View style={[styles.conditionIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                  <Text style={styles.conditionIcon}>💰</Text>
                </View>
                <Text style={[styles.conditionText, { color: colors.textSecondary }]}>Amount below{'\n'}<Text style={[styles.conditionBold, { color: colors.text }]}>₹200</Text></Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {selectedImages.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Attached Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryImagesScroll}>
            {selectedImages.map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.summaryImage} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {!(currentStep === 1 && (showTypesLanding || selectedLandingCategory)) && (
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sell Scrap</Text>
          <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>{stepTitles[currentStep - 1]}</Text>
          {renderStepIndicator()}
        </View>
      )}

      <ScrollView
        style={[
          styles.content,
          currentStep === 1 && !showTypesLanding && selectedLandingCategory
            ? { backgroundColor: SCRAP_CATEGORY_DETAILS[selectedLandingCategory].lightBackground }
            : null,
        ]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          currentStep === 1 && !showTypesLanding && selectedLandingCategory
            ? { backgroundColor: SCRAP_CATEGORY_DETAILS[selectedLandingCategory].lightBackground }
            : null,
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {currentStep === 1 && showTypesLanding && renderTypesLanding()}
        {currentStep === 1 && !showTypesLanding && selectedLandingCategory && renderCategoryShowcase(selectedLandingCategory)}
        {currentStep === 1 && !showTypesLanding && !selectedLandingCategory && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {selectedItems.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity style={[styles.previousButton, { backgroundColor: colors.card }]} onPress={handlePrevious}>
                <ArrowLeft size={20} color={colors.textSecondary} />
                <Text style={[styles.previousButtonText, { color: colors.textSecondary }]}>Previous</Text>
              </TouchableOpacity>
            )}

            <View style={styles.totalSection}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Estimated Total</Text>
              <View style={styles.totalAmount}>
                <IndianRupee size={16} color={colors.primary} />
                <Text style={[styles.totalValue, { color: colors.primary }]}>{Math.round(totalPayout)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={submittingOrder}
            >
              <LinearGradient
                colors={isDark ? ['#22c55e', '#16a34a', '#15803d'] : ['#16a34a', '#15803d', '#166534']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                {submittingOrder ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentStep === 4 ? 'Schedule' : 'Next'}
                    </Text>
                    <ArrowRight size={16} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Breakdown Sidebar */}
      {showBreakdownSidebar && (
        <Modal transparent visible animationType="none" onRequestClose={closeBreakdownSidebar}>
          <TouchableWithoutFeedback onPress={closeBreakdownSidebar}>
            <View style={sidebarStyles.overlay}>
              <Animated.View style={[sidebarStyles.drawer, { backgroundColor: colors.surface, transform: [{ translateX: sidebarAnim }] }]}>
                <TouchableWithoutFeedback>
                  <View style={{ flex: 1 }}>
                    {/* Sidebar Header */}
                    <View style={[sidebarStyles.header, { borderBottomColor: colors.border }]}>
                      <Text style={[sidebarStyles.headerTitle, { color: colors.text }]}>Order Breakdown</Text>
                      <TouchableOpacity onPress={closeBreakdownSidebar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <X size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={sidebarStyles.body} showsVerticalScrollIndicator={false}>
                      {/* Items List */}
                      <Text style={[sidebarStyles.sectionLabel, { color: colors.textSecondary }]}>ITEMS</Text>
                      {selectedItems.map((item, index) => (
                        <View key={item.id} style={[sidebarStyles.itemRow, index < selectedItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[sidebarStyles.itemName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[sidebarStyles.itemMeta, { color: colors.textSecondary }]}>{item.quantity} {item.unit} × ₹{item.rate}/{item.unit}</Text>
                          </View>
                          <Text style={[sidebarStyles.itemPrice, { color: colors.text }]}>₹{Math.round(item.rate * item.quantity)}</Text>
                        </View>
                      ))}

                      {/* Subtotal */}
                      <View style={[sidebarStyles.subtotalRow, { borderTopColor: colors.border }]}>
                        <Text style={[sidebarStyles.subtotalLabel, { color: colors.textSecondary }]}>Estimated Scrap Value</Text>
                        <Text style={[sidebarStyles.subtotalValue, { color: colors.text }]}>₹{Math.round(estimatedValue)}</Text>
                      </View>

                      {/* Referral Bonus */}
                      {useReferralBonus && referralBonus > 0 && (
                        <View style={sidebarStyles.adjustmentRow}>
                          <View style={sidebarStyles.adjustmentLeft}>
                            <View style={[sidebarStyles.adjustmentDot, { backgroundColor: '#22c55e' }]} />
                            <Text style={[sidebarStyles.adjustmentLabel, { color: colors.text }]}>Referral Bonus</Text>
                          </View>
                          <Text style={[sidebarStyles.adjustmentValue, { color: '#22c55e' }]}>+₹{Math.round(referralBonus)}</Text>
                        </View>
                      )}

                      {/* Delivery Charge */}
                      {deliveryCharge > 0 && (
                        <View style={sidebarStyles.adjustmentRow}>
                          <View style={sidebarStyles.adjustmentLeft}>
                            <View style={[sidebarStyles.adjustmentDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={[sidebarStyles.adjustmentLabel, { color: colors.text }]}>Delivery Charge</Text>
                          </View>
                          <Text style={[sidebarStyles.adjustmentValue, { color: '#ef4444' }]}>-₹{deliveryCharge}</Text>
                        </View>
                      )}

                      {/* Total */}
                      <View style={[sidebarStyles.totalRow, { borderTopColor: colors.border }]}>
                        <Text style={[sidebarStyles.totalLabel, { color: colors.text }]}>Total Payout</Text>
                        <Text style={[sidebarStyles.totalValue, { color: colors.primary }]}>₹{Math.round(totalPayout)}</Text>
                      </View>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Quantity Selector Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQuantityModal}
        onRequestClose={closeQuantityModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.quantityModalOverlay}>
            <TouchableWithoutFeedback onPress={closeQuantityModal}>
              <View style={styles.quantityModalOverlay} />
            </TouchableWithoutFeedback>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.quantityModalContent, { backgroundColor: colors.surface }]}>
                {/* Header */}
                <View style={[styles.quantityModalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.quantityModalTitleContainer}>
                    <Scale size={20} color={modalAccent} />
                    <Text style={[styles.quantityModalTitle, { color: colors.text }]}>
                      Select Quantity
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeQuantityModal} style={styles.quantityModalClose}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Product Info */}
                {selectedProduct && (
                  <View style={styles.quantityModalProduct}>
                    <View style={styles.quantityModalProductInfo}>
                      {getImageForProduct(selectedProduct) && (
                        <RemoteImage
                          source={getImageForProduct(selectedProduct)!}
                          fallback={getFallbackImageForProduct(selectedProduct.name)}
                          style={styles.quantityModalProductImage}
                          showLoadingIndicator={false}
                        />
                      )}
                      <View style={styles.quantityModalProductDetails}>
                        <Text style={[styles.quantityModalProductName, { color: colors.text }]}>
                          {selectedProduct.name}
                        </Text>
                        <Text style={[styles.quantityModalProductRate, { color: modalAccent }]}>
                          ₹{selectedProduct.min_rate}-{selectedProduct.max_rate}/{selectedProduct.unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Quantity Controls */}
                <View style={styles.quantityModalControls}>
                  <Text style={[styles.quantityModalLabel, { color: colors.textSecondary }]}>
                    Quantity ({selectedProduct?.unit})
                  </Text>

                  <View style={styles.quantityModalInputContainer}>
                    <TouchableOpacity
                      style={[styles.quantityModalButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={decrementQuantity}
                    >
                      <Minus size={24} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.quantityModalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={tempQuantity}
                      onChangeText={setTempQuantity}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />

                    <TouchableOpacity
                      style={[styles.quantityModalButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={incrementQuantity}
                    >
                      <Plus size={24} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  {/* Quick Select Buttons */}
                  <View style={styles.quantityModalQuickSelect}>
                    <Text style={[styles.quantityModalQuickLabel, { color: colors.textSecondary }]}>
                      Quick Select:
                    </Text>
                    <View style={styles.quantityModalQuickButtons}>
                      {[1, 5, 10, 20, 50].map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.quantityModalQuickButton,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            tempQuantity === value.toString() && { backgroundColor: modalSoftBg, borderColor: modalAccent }
                          ]}
                          onPress={() => setTempQuantity(value.toString())}
                        >
                          <Text style={[
                            styles.quantityModalQuickButtonText,
                            { color: colors.textSecondary },
                            tempQuantity === value.toString() && { color: modalAccent, fontWeight: '600' }
                          ]}>
                            {value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Estimated Value */}
                  {selectedProduct && (
                    <View style={[styles.quantityModalEstimate, { backgroundColor: modalSoftBg, borderColor: modalAccent }]}>
                      <Text style={[styles.quantityModalEstimateLabel, { color: colors.textSecondary }]}>
                        Estimated Value:
                      </Text>
                      <Text style={[styles.quantityModalEstimateValue, { color: modalAccent }]}>
                        ₹{Math.round(selectedProduct.min_rate * (parseFloat(tempQuantity) || 0))}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.quantityModalActions}>
                  <TouchableOpacity
                    style={[styles.quantityModalCancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={closeQuantityModal}
                  >
                    <Text style={[styles.quantityModalCancelText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quantityModalConfirmButton}
                    onPress={handleQuantityConfirm}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[modalAccent, modalAccent]}
                      style={styles.quantityModalConfirmGradient}
                    >
                      <Text style={styles.quantityModalConfirmText}>
                        {selectedItems.find(i => i.id === selectedProduct?.id) ? 'Update' : 'Add Item'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Network Retry Overlay - handles network errors silently */}
      <NetworkRetryOverlay
        visible={showRetryOverlay}
        countdown={countdown}
        isRetrying={isRetrying}
        hasFailedPermanently={hasFailedPermanently}
        errorMessage={errorMessage || undefined}
        onRetryNow={retryNow}
      />

      <Toast />

      {/* Tutorial Overlay */}
      <TutorialOverlay />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        orderId={lastOrderId}
        context="order_completion"
        onSubmitSuccess={() => {
          setLastOrderId(null);
        }}
      />
    </View>
  );
}

// Styles from the new UI (keeping exactly as provided)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stepCircleActive: {
    backgroundColor: 'transparent',
  },
  stepGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  stepNumberActive: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#16a34a',
  },
  content: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  stepContent: {
    padding: 20,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  categoriesContainer: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeaderSell: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryTitleSell: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  categoryItems: {
    gap: 8,
  },
  typesRoot: {
    flex: 1,
  },
  typesHeader: {
    height: 170,
    paddingTop: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  typesBackButton: {
    marginTop: 4,
    width: 36,
    position: 'absolute',
    left: 20,
    top: 62,
    alignItems: 'center',
    zIndex: 2,
  },
  typesHeaderTitle: {
    color: '#f3f4f6',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -0.8,
    width: '100%',
    textAlign: 'center',
  },
  typesGrid: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typesCardWrap: {
    width: (width - 62) / 2,
    marginBottom: 18,
    alignItems: 'center',
  },
  typesCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 5,
  },
  typesCardImage: {
    width: '88%',
    height: '88%',
    alignSelf: 'center',
    marginTop: '6%',
  },
  typesCardLabel: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryShowcaseRoot: {
    flex: 1,
  },
  categoryShowcaseHeaderRow: {
    marginTop: 48,
    marginBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryShowcaseBackButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 14,
    top: 4,
  },
  categoryShowcaseTitle: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryShowcaseScrollContent: {
    paddingBottom: 24,
  },
  categoryShowcaseHeadImage: {
    width: width - 24,
    height: 208,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  categoryShowcaseListWrap: {
    paddingHorizontal: 12,
  },
  categoryShowcaseListTitle: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 10,
  },
  categoryShowcaseItemRow: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryShowcaseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryShowcaseItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryShowcaseItemTextWrap: {
    flex: 1,
  },
  categoryShowcaseItemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryShowcaseItemDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  categoryShowcaseItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  categoryShowcaseRate: {
    fontSize: 13,
    marginBottom: 4,
  },
  categoryShowcaseSelectedQty: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryShowcaseSellBtn: {
    backgroundColor: '#b99762',
    paddingHorizontal: 14,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryShowcaseSellBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryShowcaseRateHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  categoryShowcaseContactImage: {
    width: width - 24,
    height: 152,
    borderRadius: 14,
    alignSelf: 'center',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemInfo: {
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemRate: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    color: '#16a34a',
  },
  itemDescription: {
    fontSize: 11,
    color: '#6b7280',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  quantityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItems: {
    marginTop: 24,
  },
  selectedItemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  selectedItemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  selectedItemIconImage: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 6,
  },
  itemIconImage: {
    width: 44,
    height: 44,
    marginRight: 12,
    borderRadius: 10,
  },
  summaryItemIconImage: {
    width: 28,
    height: 28,
    marginRight: 10,
    borderRadius: 6,
  },
  selectedItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    // helps on very small screens
    flexShrink: 1,
  },
  selectedItemRate: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
    minWidth: 40,
    textAlign: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  step2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 14,
  },
  step2IconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datesScroll: {
    marginHorizontal: -4,
  },
  dateCardPro: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    minWidth: 72,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  dateTextSelected: {
    color: '#16a34a',
  },
  timeSection: {
    marginBottom: 24,
  },
  timeSlotsGrid: {
    gap: 10,
  },
  timeSlotPro: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  timeSlotInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeSlotCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  noSlotsText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  selectDatePrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
    marginTop: 8,
  },
  selectDatePromptText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  scheduleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    marginTop: 8,
  },
  scheduleSummaryText: {
    flex: 1,
  },
  scheduleSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  timeSlotTextSelected: {
    color: '#16a34a',
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  addressTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  addressTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  addressTabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addressTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  addressTabTextActive: {
    color: '#111827',
  },
  addressForm: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  savedAddresses: {
    gap: 12,
  },
  savedAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  savedAddressCardActive: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  savedAddressInfo: {
    flex: 1,
  },
  savedAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  savedAddressText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  savedAddressRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  noSavedAddress: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  noSavedAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  noSavedAddressSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  photoButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
  },
  photoButtonSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  summaryItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryTotalAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#16a34a',
  },
  summaryDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  summaryImagesScroll: {
    marginTop: 12,
  },
  summaryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  previousButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  totalSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 3,
  },
  totalAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
    marginLeft: 2,
  },
  nextButton: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 1,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  contactHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  contactForm: {
    gap: 16,
  },
  formInputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  errorTextCentered: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 16,
    textAlign: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
  },
  mobileInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  mobileIcon: {
    marginLeft: 12,
  },
  photoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  selectedImagesContainer: {
    marginTop: 20,
  },
  selectedImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  imagesScroll: {
    marginHorizontal: -8,
  },
  imageContainer: {
    marginHorizontal: 8,
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#dcfce7',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  referralHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  referralBalance: {
    fontSize: 14,
    color: '#16a34a',
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  }, referralToggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    padding: 3,
    justifyContent: 'center',
  },
  referralToggleActive: {
    backgroundColor: '#16a34a',
  },
  referralToggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  referralToggleCircleActive: {
    alignSelf: 'flex-end',
  },
  referralDiscountInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  referralDiscountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  referralDiscountSubtext: {
    fontSize: 13,
    color: '#15803d',
    fontFamily: 'Inter-Regular',
  },
  lockedBadge: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedBadgeText: {
    fontSize: 16,
  },
  referralLockedInfo: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  referralLockedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  referralLockedTextContainer: {
    flex: 1,
  },
  referralLockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  referralLockedSubtext: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 18,
  },
  finalAmountCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  finalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finalAmountLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
  },
  finalAmountValue: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountLabelDiscount: {
    fontSize: 14,
    color: '#16a34a',
    fontFamily: 'Inter-Medium',
  },
  finalAmountValueDiscount: {
    fontSize: 14,
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountLabelBonus: {
    fontSize: 14,
    color: '#16a34a',
    fontFamily: 'Inter-Medium',
  },
  finalAmountValueBonus: {
    fontSize: 14,
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountDivider: {
    height: 1,
    backgroundColor: '#16a34a',
    marginVertical: 12,
    opacity: 0.3,
  },
  finalAmountLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountValueFinal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountNote: {
    fontSize: 12,
    color: '#15803d',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  pickupDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  pickupDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  pickupDetailsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickupDetailsContent: {
    padding: 20,
  },
  pickupDetailRow: {
    gap: 12,
  },
  pickupDetailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickupDetailLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickupDetailValue: {
    gap: 8,
  },
  pickupDetailValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pickupTimeBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pickupTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  pickupDetailDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  addressTitleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  addressTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  pickupAddressText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  notesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    maxHeight: 150,
  },
  notesHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pickupChargesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  pickupChargesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  pickupChargesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickupChargesIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupChargesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  chargeOptionsContainer: {
    padding: 16,
    gap: 12,
  },
  freeChargeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#16a34a',
    overflow: 'hidden',
  },
  paidChargeCard: {
    backgroundColor: '#fef9f0',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f59e0b',
    overflow: 'hidden',
  },
  chargeCardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  freeTagLarge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  freeTagLargeText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  paidTagLarge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  paidTagLargeText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  chargeConditionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  chargeCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
  },
  conditionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionIcon: {
    fontSize: 24,
  },
  conditionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    flex: 1,
  },
  conditionBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#16a34a',
    opacity: 0.3,
  },
  orDividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    paddingHorizontal: 8,
  },
  andDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  andDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f59e0b',
    opacity: 0.3,
  },
  andDividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    paddingHorizontal: 8,
  },
  // Quantity Modal Styles
  quantityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  quantityModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  quantityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  quantityModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  quantityModalClose: {
    padding: 4,
  },
  quantityModalProduct: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quantityModalProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityModalProductImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  quantityModalProductDetails: {
    flex: 1,
  },
  quantityModalProductName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quantityModalProductRate: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantityModalControls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quantityModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  quantityModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  quantityModalButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityModalInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  quantityModalQuickSelect: {
    marginBottom: 20,
  },
  quantityModalQuickLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  quantityModalQuickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityModalQuickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  quantityModalQuickButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantityModalEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quantityModalEstimateLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  quantityModalEstimateValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  quantityModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  quantityModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  quantityModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quantityModalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quantityModalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  quantityModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

const sidebarStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: width * 0.82,
    flex: 1,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  subtotalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  adjustmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  adjustmentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  adjustmentValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1.5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
});
