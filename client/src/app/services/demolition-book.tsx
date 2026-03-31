import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { parse, format, addDays, startOfToday, setHours, setMinutes } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLocation, SavedLocation } from '../../context/LocationContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { AuthService, ServiceBookingPayload, AddressSummary } from '../../api/apiService';
import { services } from '../(tabs)/services';
import MapLocationPicker from '../../components/MapLocationPicker';
import NetworkRetryOverlay from '../../components/NetworkRetryOverlay';
import { useNetworkRetry } from '../../hooks/useNetworkRetry';
import { populateFormFromLocation, LocationResult } from '../../utils/addressHelpers';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  CheckCircle,
  Plus,
  Navigation,
  Home,
  Building,
  Building2,
  Hammer,
  Pickaxe,
  Zap,
  AlertCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ===== DEMOLITION TYPES CONFIG =====
const DEMOLITION_TYPES = [
  {
    id: 'full_building',
    title: 'Full Building Demolition',
    description: 'Complete structure to ground level.',
    icon: Building2,
    priceRange: '₹ 8,000+',
    priceRangeEng: 'Rs 8,000+',
    tags: ['Heavy machinery'],
    image: require('../../../assets/images/services/demolition/full_building.webp'),
  },
  {
    id: 'partial',
    title: 'Partial Demolition',
    description: 'A floor, wing or section only.',
    icon: Hammer,
    priceRange: '₹ 3,500+',
    priceRangeEng: 'Rs 3,500+',
    tags: ['Precision'],
    image: require('../../../assets/images/services/demolition/partial_builing.webp'),
  },
  {
    id: 'interior',
    title: 'Interior Demolition',
    description: 'Walls, flooring, false ceiling inside.',
    icon: AlertCircle,
    priceRange: '₹ 2,000+',
    priceRangeEng: 'Rs 2,000+',
    tags: ['Same-day'],
    image: require('../../../assets/images/services/demolition/interior_demolition.webp'),
  },
  {
    id: 'wall_breaking',
    title: 'Wall Breaking / Cutting',
    description: 'Window/Door opening or single wall.',
    icon: Pickaxe,
    priceRange: '₹ 800+',
    priceRangeEng: 'Rs 800+',
    tags: ['Most popular'],
    image: require('../../../assets/images/services/demolition/wall_breaking.webp'),
  },
  {
    id: 'slab_roof',
    title: 'Slab / Roof Demolition',
    description: 'Concrete slab or roof structure.',
    icon: AlertCircle,
    priceRange: '₹ 5,000+',
    priceRangeEng: 'Rs 5,000+',
    tags: ['Structural'],
    image: require('../../../assets/images/services/demolition/slab_roof_demolition.webp'),
  },
];

// ===== TIME SLOTS CONFIG =====
const TIME_SLOTS = [
  '09:00 AM', '11:00 AM', '01:00 PM',
  '03:00 PM', '05:00 PM', '07:00 PM'
];

// Parse time slot to 24-hour integer
const getSlotHour = (slot: string): number => {
  const match = slot.match(/(\d+):(\d+) (AM|PM)/);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  if (match[3] === 'PM' && h < 12) h += 12;
  if (match[3] === 'AM' && h === 12) h = 0;
  return h;
};

// Current hour in IST (UTC+5:30)
const getCurrentISTHour = (): number => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000).getHours();
};

// Get available time slots for a date
const getAvailableTimeSlots = (date: Date | null): string[] => {
  if (!date) return TIME_SLOTS;
  const isToday = date.toDateString() === startOfToday().toDateString();
  if (!isToday) return TIME_SLOTS;
  const currentHour = getCurrentISTHour();
  return TIME_SLOTS.filter(slot => getSlotHour(slot) > currentHour);
};

// Generate next 14 days
const getBookingDates = () => {
  const dates = [];
  const today = startOfToday();
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    dates.push({
      fullDate: date,
      dayName: i === 0 ? 'Today' : format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      month: format(date, 'MMM'),
    });
  }
  return dates;
};

// Validate phone
const validatePhone = (value: string) => /^(\+?\d{6,15})$/.test(value.trim());

// ==================== MAIN COMPONENT ====================
export default function DemolitionBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { savedLocations, reloadAddresses } = useLocation();

  // ===== STATE MANAGEMENT =====
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Structure Type
  const [selectedStructureType, setSelectedStructureType] = useState<string | null>(null);

  // Step 2: Schedule Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSummary | null>(null);
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Step 3: Review & Submit
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const selectedTimeRef = React.useRef(selectedTime);
  useEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  // Reset time if date changes and selected time is no longer available
  useEffect(() => {
    if (!selectedDate || !selectedTimeRef.current) return;
    const available = getAvailableTimeSlots(selectedDate);
    if (!available.includes(selectedTimeRef.current)) {
      setSelectedTime(null);
    }
  }, [selectedDate]);

  // ===== Data Loading =====
  const loadInitialData = async () => {
    setLoadingUser(true);
    setLoadingAddresses(true);

    const [user, addressData] = await Promise.all([
      AuthService.getUser(),
      AuthService.getAddresses(),
    ]);

    setName(user.name || '');
    setAddresses(addressData);

    if (addressData.length > 0 && !selectedAddress) {
      setSelectedAddress(addressData[0]);
    }

    setLoadingUser(false);
    setLoadingAddresses(false);
  };

  const { showRetryOverlay, countdown, isRetrying, hasFailedPermanently, errorMessage, retryNow, startRetryFlow, resetRetryState, checkNetworkAndLoad } =
    useNetworkRetry({
      fetchFn: loadInitialData,
      countdownSeconds: 5,
      maxRetries: 3,
    });

  useEffect(() => {
    const initLoad = async () => {
      const isConnected = await checkNetworkAndLoad();
      if (isConnected) {
        try {
          await loadInitialData();
        } catch (error: any) {
          const errorMsg = error.message || 'Failed to load data';
          const isNetworkError =
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('internet') ||
            errorMsg.toLowerCase().includes('connection');

          if (isNetworkError) {
            startRetryFlow(errorMsg);
          } else {
            setLoadingUser(false);
            setLoadingAddresses(false);
          }
        }
      }
    };

    initLoad();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const addressData = await AuthService.getAddresses();
      setAddresses(addressData);

      if (addressData.length > 0 && !selectedAddress) {
        setSelectedAddress(addressData[0]);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddressSelect = (address: AddressSummary) => {
    setSelectedAddress(address);
    setShowAddressModal(false);
  };

  const handleMapLocationSelect = async (location: LocationResult) => {
    try {
      const newAddress: any = {
        name: 'Service Location',
        phone_number: phone || '',
        room_number: '',
        street: location.address.split(',')[0] || '',
        area: location.area,
        city: location.city,
        state: location.state,
        country: 'India',
        pincode: parseInt(location.pincode) || 0,
        delivery_suggestion: '',
      };

      const savedAddress = await AuthService.createAddress(newAddress);
      setAddresses([...addresses, savedAddress]);
      setSelectedAddress(savedAddress);
      setShowMapPicker(false);

      Toast.show({
        type: 'success',
        text1: 'Address Added',
        text2: 'Location has been saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving address:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to save address',
      });
    }
  };

  const getAddressIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('home') || lowerName.includes('house')) {
      return <Home size={18} color={colors.primary} />;
    }
    if (lowerName.includes('office') || lowerName.includes('work')) {
      return <Building size={18} color={colors.info} />;
    }
    return <MapPin size={18} color={colors.textSecondary} />;
  };

  const formatAddressShort = (addr: AddressSummary) => {
    return `${addr.area}, ${addr.city}`;
  };

  const formatAddressFull = (addr: AddressSummary) => {
    const parts = [addr.room_number, addr.street, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.join(', ');
  };

  // ===== BUILD PREFERRED DATETIME =====
  const buildPreferredDateTime = () => {
    if (!selectedDate || !selectedTime) {
      throw new Error('Please select both a date and a time slot');
    }

    const timeParts = selectedTime.match(/(\d+):(\d+) (AM|PM)/);
    if (!timeParts) throw new Error('Invalid time format');

    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const meridian = timeParts[3];

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    const combinedDate = setMinutes(setHours(new Date(selectedDate), hours), minutes);
    return combinedDate.toISOString();
  };

  // ===== VALIDATE STEP 1 & 2 =====
  const canProceedToStep2 = selectedStructureType !== null;

  const canProceedToStep3 =
    name.trim() &&
    validatePhone(phone) &&
    selectedAddress &&
    selectedDate &&
    selectedTime;

  // ===== SUBMIT BOOKING =====
  const handleSubmit = async () => {
    try {
      if (!canProceedToStep3) {
        return Alert.alert('Missing Information', 'Please complete all fields before submitting.');
      }

      setSubmitting(true);

      const preferredDateTime = buildPreferredDateTime();
      const fullAddress = formatAddressFull(selectedAddress!);

      const payload: ServiceBookingPayload = {
        service: 'demolition',
        name: name.trim(),
        phone: phone.trim(),
        address: fullAddress,
        preferredDateTime,
        notes: notes.trim() || undefined,
        service_details: {
          service_type: 'demolition',
          structure_type: selectedStructureType,
        },
      };

      const result = await AuthService.createServiceBooking(payload);

      setSuccessMessage('Booking Confirmed! Meeting details have been sent to your email.');

      setTimeout(() => {
        router.replace('/(tabs)/services');
      }, 3000);
    } catch (error: any) {
      console.error('❌ Booking error:', error);

      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        'Network error. Please check your connection and try again.';

      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== HANDLE BACK =====
  const handleBack = () => {
    if (successMessage) {
      router.replace('/(tabs)/services');
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((step) => (step - 1) as 1 | 2 | 3);
    } else {
      router.back();
    }
  };

  // ===== STEP 1: SELECT STRUCTURE TYPE =====
  const renderStep1 = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>SELECT STRUCTURE TYPE</Text>

      {DEMOLITION_TYPES.map((demolType) => (
        <TouchableOpacity
          key={demolType.id}
          style={[
            styles.typeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedStructureType === demolType.id && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setSelectedStructureType(demolType.id)}
        >
          <View style={styles.typeCardContent}>
            <View style={styles.typeIconContainer}>
              <Image
                source={demolType.image}
                style={[
                  styles.typeImage,
                  selectedStructureType === demolType.id && styles.typeImageSelected,
                ]}
                resizeMode="cover"
              />
            </View>

            <View style={styles.typeTextContainer}>
              <Text
                style={[
                  styles.typeTitle,
                  { color: selectedStructureType === demolType.id ? '#fff' : colors.text },
                ]}
              >
                {demolType.title}
              </Text>
              <Text
                style={[
                  styles.typeDescription,
                  { color: selectedStructureType === demolType.id ? '#fff' : colors.textSecondary },
                ]}
              >
                {demolType.description}
              </Text>
              <View style={styles.priceAndTags}>
                <Text
                  style={[
                    styles.priceRange,
                    { color: selectedStructureType === demolType.id ? '#fff' : colors.primary },
                  ]}
                >
                  {demolType.priceRangeEng}
                </Text>
                {demolType.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: selectedStructureType === demolType.id ? 'rgba(255,255,255,0.3)' : colors.info + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: selectedStructureType === demolType.id ? '#fff' : colors.info },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {selectedStructureType === demolType.id && (
            <View style={styles.checkmarkContainer}>
              <CheckCircle size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ===== STEP 2: SCHEDULE SERVICE =====
  const bookingDates = useMemo(() => getBookingDates(), []);

  const renderStep2 = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Contact Details */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Details</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Phone size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
      </View>

      {/* Service Address */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MapPin size={20} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>
            Service Address
          </Text>
        </View>

        {selectedAddress ? (
          <TouchableOpacity
            style={[styles.selectedAddressCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => setShowAddressModal(true)}
          >
            <View style={styles.addressCardContent}>
              {getAddressIcon(selectedAddress.name)}
              <View style={styles.addressTextContainer}>
                <Text style={[styles.addressName, { color: colors.text }]}>{selectedAddress.name}</Text>
                <Text style={[styles.addressShort, { color: colors.textSecondary }]} numberOfLines={1}>
                  {formatAddressShort(selectedAddress)}
                </Text>
              </View>
            </View>
            <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addAddressButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowAddressModal(true)}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={[styles.addAddressText, { color: colors.primary }]}>Select Address</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Select Date */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Calendar size={20} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>
            Select Date
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {bookingDates.map((item, index) => {
            if (getAvailableTimeSlots(item.fullDate).length === 0) return null;
            const isSelected = selectedDate?.toDateString() === item.fullDate.toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: colors.textSecondary },
                    isSelected && styles.textSelected,
                  ]}
                >
                  {item.dayName}
                </Text>
                <Text style={[styles.dayNumber, { color: colors.text }, isSelected && styles.textSelected]}>
                  {item.dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Select Time */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Clock size={20} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>
            Select Time
          </Text>
        </View>
        {(() => {
          const availableSlots = getAvailableTimeSlots(selectedDate);
          if (availableSlots.length === 0) {
            return (
              <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>
                No available time slots for this date.
              </Text>
            );
          }
          return (
            <View style={styles.timeGrid}>
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlot,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        { color: colors.text },
                        isSelected && styles.textSelected,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
      </View>

      {/* Additional Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border, height: 100 }]}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                textAlignVertical: 'top',
                height: 100,
                paddingTop: 12,
              },
            ]}
            placeholder="Any specific requirements?"
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    </ScrollView>
  );

  // ===== STEP 3: REVIEW SUMMARY =====
  const renderStep3 = () => {
    const selectedType = DEMOLITION_TYPES.find((t) => t.id === selectedStructureType);

    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>REVIEW SUMMARY</Text>

        {/* Booking Details */}
        <View style={[styles.summarySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Details</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Service</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>Demolition</Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Type</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedType?.title}</Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Scheduled Date</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {selectedDate ? format(selectedDate, 'dd-MM-yyyy (EEEE)') : 'N/A'}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Scheduled Time</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedTime || 'N/A'}</Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Address</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {selectedAddress ? formatAddressShort(selectedAddress) : 'N/A'}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Contact</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{phone}</Text>
          </View>
        </View>

        <View style={[styles.confirmationBox, { backgroundColor: colors.surface }]}>
          <Image
            source={require('../../../assets/images/services/demolition/thank_you_converted.webp')}
            style={styles.confirmationImage}
            resizeMode="contain"
          />
          <Text style={[styles.confirmationTitle, { color: colors.text }]}>
            Thank you for choosing Scrapiz!
          </Text>
        </View>
      </ScrollView>
    );
  };

  // ===== RENDER CURRENT STEP =====
  if (successMessage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Demolition Service</Text>
        </View>

        <View style={styles.successContainer}>
          <CheckCircle size={64} color={colors.primary} />
          <Text style={[styles.successTitle, { color: colors.text }]}>Success!</Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>{successMessage}</Text>
          <Text style={[styles.successSubtext, { color: colors.textTertiary }]}>
            Check your email for meeting details
          </Text>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/services')}
          >
            <Text style={styles.homeButtonText}>Back to Services</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Progress */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Demolition Service</Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        step <= currentStep ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {step < currentStep && <CheckCircle size={16} color="#fff" />}
                  {step === currentStep && <Text style={styles.progressNumber}>{step}</Text>}
                  {step > currentStep && <Text style={styles.progressNumber}>{step}</Text>}
                </View>
                {step < 3 && <View style={[styles.progressLine, { backgroundColor: step < currentStep ? colors.primary : colors.border }]} />}
              </View>
            ))}
          </View>
          </View>
        </View>

        {/* Step Content */}
        {loadingUser ? (
          <View style={styles.successContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.successSubtext, { color: colors.textSecondary, marginTop: 16 }]}>
              Loading...
            </Text>
          </View>
        ) : (
          <>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </>
        )}

        {/* Action Buttons */}
        <View style={[styles.actionButtonsContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {currentStep > 1 && !successMessage && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleBack}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
              !canProceedToStep3 && currentStep === 3 && { opacity: 0.5 },
              currentStep === 1 && !canProceedToStep2 && { opacity: 0.5 },
              currentStep === 2 && !canProceedToStep3 && { opacity: 0.5 },
            ]}
            disabled={
              (currentStep === 1 && !canProceedToStep2) ||
              (currentStep === 2 && !canProceedToStep3) ||
              (currentStep === 3 && submitting)
            }
            onPress={async () => {
              if (currentStep === 1) {
                setCurrentStep(2);
              } else if (currentStep === 2) {
                setCurrentStep(3);
              } else {
                await handleSubmit();
              }
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === 3 ? 'Confirm Booking' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Address Selection Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Service Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingAddresses ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <ScrollView>
                {addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressOption,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedAddress?.id === addr.id && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleAddressSelect(addr)}
                  >
                    <View style={styles.addressCardContent}>
                      {getAddressIcon(addr.name)}
                      <View style={styles.addressTextContainer}>
                        <Text style={[styles.addressName, { color: colors.text }]}>{addr.name}</Text>
                        <Text style={[styles.addressShort, { color: colors.textSecondary }]} numberOfLines={2}>
                          {formatAddressFull(addr)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.addNewAddressOption, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                  onPress={() => {
                    setShowAddressModal(false);
                    setShowMapPicker(true);
                  }}
                >
                  <Plus size={20} color={colors.primary} />
                  <Text style={[styles.addNewAddressText, { color: colors.primary }]}>Add New Address</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapLocationPicker
          onLocationSelect={handleMapLocationSelect}
          onCancel={() => setShowMapPicker(false)}
        />
      )}

      {/* Network Retry Overlay */}
      {showRetryOverlay && (
        <NetworkRetryOverlay
          errorMessage={errorMessage}
          countdown={countdown}
          isRetrying={isRetrying}
          hasFailedPermanently={hasFailedPermanently}
          onRetry={retryNow}
        />
      )}
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    position: 'relative',
  },
  headerTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff',
  },
  progressLine: {
    height: 3,
    width: 84,
    marginHorizontal: 12,
    borderRadius: 999,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexGrow: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // ===== STEP 1 STYLES =====
  typeCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
  },
  typeCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  typeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  typeImageSelected: {
    opacity: 1,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    marginBottom: 8,
  },
  priceAndTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceRange: {
    fontSize: 12,
    fontWeight: '600',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // ===== INPUT STYLES =====
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  // ===== ADDRESS STYLES =====
  selectedAddressCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressShort: {
    fontSize: 12,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addAddressButton: {
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ===== DATE/TIME STYLES =====
  dateScroll: {
    paddingRight: 16,
  },
  dateCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  textSelected: {
    color: '#fff',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: '30%',
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // ===== SUMMARY STYLES =====
  summarySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  confirmationBox: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmationImage: {
    width: '100%',
    height: 180,
    marginBottom: 12,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // ===== ACTION BUTTONS =====
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ===== SUCCESS STYLES =====
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  homeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 12,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '300',
  },
  addressOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    flexDirection: 'row',
  },
  addNewAddressOption: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addNewAddressText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
