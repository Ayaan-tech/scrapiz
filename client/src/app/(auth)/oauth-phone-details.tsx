import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Gift, ArrowRight, Check } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthService } from '../../api/apiService';
import Toast from 'react-native-toast-message';
import { wp, hp, fs, spacing } from '../../utils/responsive';

const { height } = Dimensions.get('window');

// ─── Referral Code Input ───────────────────────────────────────────────────────
// 8-character boxes split XXXX-XXXX (identical to register.tsx PromoCodeInput)
const ReferralCodeInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  disabled: boolean;
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));

  useEffect(() => {
    const clean = value.replace(/-/g, '');
    const parsed = clean.split('').slice(0, 8);
    while (parsed.length < 8) parsed.push('');
    setDigits(parsed);
  }, [value]);

  const handleChange = (text: string, index: number) => {
    const sanitised = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (sanitised.length <= 1) {
      const next = [...digits];
      next[index] = sanitised;
      setDigits(next);
      const left = next.slice(0, 4).join('');
      const right = next.slice(4, 8).join('');
      onChange(right ? `${left}-${right}` : left);
      if (sanitised && index < 7) inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={referralStyles.container}>
      <View style={referralStyles.boxRow}>
        {digits.slice(0, 4).map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => (inputRefs.current[i] = r)}
            style={[referralStyles.box, digit ? referralStyles.boxFilled : undefined]}
            value={digit}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            maxLength={1}
            autoCapitalize="characters"
            editable={!disabled}
            keyboardType="default"
            selectTextOnFocus
          />
        ))}
      </View>
      <Text style={referralStyles.hyphen}>-</Text>
      <View style={referralStyles.boxRow}>
        {digits.slice(4, 8).map((digit, i) => (
          <TextInput
            key={i + 4}
            ref={(r) => (inputRefs.current[i + 4] = r)}
            style={[referralStyles.box, digit ? referralStyles.boxFilled : undefined]}
            value={digit}
            onChangeText={(t) => handleChange(t, i + 4)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i + 4)}
            maxLength={1}
            autoCapitalize="characters"
            editable={!disabled}
            keyboardType="default"
            selectTextOnFocus
          />
        ))}
      </View>
    </View>
  );
};

const referralStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxRow: {
    flexDirection: 'row',
    gap: spacing(6),
  },
  box: {
    width: wp(10),
    height: wp(12),
    borderRadius: spacing(10),
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    textAlign: 'center',
    fontSize: fs(18),
    fontWeight: '700',
    color: '#1f2937',
  },
  boxFilled: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  hyphen: {
    fontSize: fs(24),
    fontWeight: '700',
    color: '#9ca3af',
    marginHorizontal: spacing(8),
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OAuthPhoneDetailsScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlide = useRef(new Animated.Value(height)).current;

  // ── Check if phone already exists on mount ──────────────────────────────────
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const user = await AuthService.getUser();
        if (user.phone_number) {
          // Phone already set — skip straight through
          await navigateToDestination();
          return;
        }
      } catch {
        // Cannot determine profile state — show the form
      }
      setIsCheckingProfile(false);
      runEntryAnimations();
    };
    checkProfile();
  }, []);

  const runEntryAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 40,
        friction: 10,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigateToDestination = async () => {
    const { hasShownNotificationPermission } = await import(
      '../../utils/notificationPermission'
    );
    const hasShown = await hasShownNotificationPermission();
    let destination = '/(tabs)/home';
    if (returnTo) destination = decodeURIComponent(returnTo);

    if (!hasShown) {
      router.replace('/notification-permission');
    } else {
      router.replace(destination as any);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validatePhone = () => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned) {
      setPhoneError('Mobile number is required');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!validatePhone()) return;
    setIsLoading(true);
    try {
      const updateData: Parameters<typeof AuthService.updateUserProfile>[0] & { promo_code?: string } = {
        phone_number: phone.trim(),
      };
      const cleanCode = referralCode.replace(/-/g, '').toUpperCase();
      if (cleanCode.length === 8) {
        (updateData as any).promo_code = cleanCode;
      }
      await AuthService.updateUserProfile(updateData);
      Toast.show({
        type: 'success',
        text1: 'Profile updated',
        text2: 'Mobile number saved successfully',
      });
      await navigateToDestination();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: error.message || 'Unable to save details. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await navigateToDestination();
  };

  // ── Loading splash while checking profile ─────────────────────────────────
  if (isCheckingProfile) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  const referralFilled = referralCode.replace(/-/g, '').length === 8;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../../assets/images/lets-get-u-starte.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)']}
          style={styles.gradientOverlay}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Logo ── */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Text style={styles.logoText}>Scrapiz</Text>
                <Text style={styles.logoTagline}>Sell smarter. Earn greener.</Text>
              </Animated.View>

              {/* ── Card ── */}
              <Animated.View
                style={[styles.card, { transform: [{ translateY: cardSlide }] }]}
              >
                {/* Heading */}
                <Text style={styles.cardTitle}>Almost there</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your mobile number so we can{'\n'}schedule your pickups seamlessly.
                </Text>

                {/* ─ Phone Number ─ */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mobile Number</Text>
                  <View
                    style={[
                      styles.phoneRow,
                      phoneError ? styles.phoneRowError : undefined,
                    ]}
                  >
                    <View style={styles.prefix}>
                      <Text style={styles.prefixText}>+91</Text>
                    </View>
                    <View style={styles.prefixDivider} />
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Enter 10-digit number"
                      placeholderTextColor="#9ca3af"
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t.replace(/[^0-9]/g, ''));
                        setPhoneError('');
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      returnKeyType="done"
                      editable={!isLoading}
                    />
                  </View>
                  {phoneError ? (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  ) : null}
                </View>

                {/* ─ Separator ─ */}
                <View style={styles.sectionSeparator} />

                {/* ─ Referral Code ─ */}
                <View style={styles.referralSection}>
                  <View style={styles.referralHeader}>
                    <Gift size={18} color="#22c55e" strokeWidth={2} />
                    <Text style={styles.referralLabel}>
                      Referral Code{' '}
                      <Text style={styles.optionalBadge}>(Optional)</Text>
                    </Text>
                  </View>

                  <ReferralCodeInput
                    value={referralCode}
                    onChange={setReferralCode}
                    disabled={isLoading}
                  />

                  {referralFilled && (
                    <View style={styles.referralSuccess}>
                      <Check size={14} color="#16a34a" strokeWidth={2.5} />
                      <Text style={styles.referralSuccessText}>
                        You'll receive ₹10 instantly on sign-up
                      </Text>
                    </View>
                  )}
                </View>

                {/* ─ Continue Button ─ */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    isLoading ? styles.buttonDisabled : undefined,
                  ]}
                  onPress={handleContinue}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Continue</Text>
                      <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
                    </>
                  )}
                </TouchableOpacity>

                {/* ─ Skip ─ */}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  disabled={isLoading}
                  activeOpacity={0.6}
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>

      <Toast />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  gradientOverlay: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // ── Logo ──
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? hp(14) : hp(12),
    paddingBottom: spacing(20),
    flex: 1,
    minHeight: hp(20),
  },
  logoText: {
    fontSize: fs(56),
    fontWeight: '800',
    color: '#22c55e',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 12,
    letterSpacing: 2,
  },
  logoTagline: {
    marginTop: spacing(6),
    fontSize: fs(13),
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.4,
    fontWeight: '400',
  },

  // ── Card ──
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: spacing(30),
    borderTopRightRadius: spacing(30),
    paddingHorizontal: spacing(24),
    paddingTop: spacing(30),
    paddingBottom: Platform.OS === 'ios' ? spacing(44) : spacing(36),
    minHeight: hp(62),
  },
  cardTitle: {
    fontSize: fs(30),
    fontWeight: '800',
    color: '#111827',
    marginBottom: spacing(8),
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: fs(14),
    color: '#6b7280',
    lineHeight: fs(21),
    marginBottom: spacing(28),
  },

  // ── Phone field ──
  fieldGroup: {
    marginBottom: spacing(8),
  },
  fieldLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing(8),
    letterSpacing: 0.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: hp(7),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: spacing(14),
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  phoneRowError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  prefix: {
    paddingHorizontal: spacing(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixText: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#374151',
  },
  prefixDivider: {
    width: 1,
    height: '55%',
    backgroundColor: '#d1d5db',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing(14),
    fontSize: fs(17),
    fontWeight: '500',
    color: '#111827',
    height: '100%',
  },
  errorText: {
    fontSize: fs(12),
    color: '#ef4444',
    marginTop: spacing(5),
    marginLeft: spacing(4),
  },

  // ── Separator ──
  sectionSeparator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: spacing(20),
  },

  // ── Referral ──
  referralSection: {
    marginBottom: spacing(28),
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(8),
    marginBottom: spacing(16),
  },
  referralLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    color: '#374151',
  },
  optionalBadge: {
    fontSize: fs(13),
    fontWeight: '400',
    color: '#9ca3af',
  },
  referralSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(6),
    marginTop: spacing(14),
    backgroundColor: '#f0fdf4',
    paddingHorizontal: spacing(14),
    paddingVertical: spacing(9),
    borderRadius: spacing(8),
    alignSelf: 'center',
  },
  referralSuccessText: {
    fontSize: fs(13),
    color: '#15803d',
    fontWeight: '500',
  },

  // ── Buttons ──
  continueButton: {
    height: hp(6.5),
    backgroundColor: '#22c55e',
    borderRadius: spacing(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(8),
    marginBottom: spacing(14),
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  continueButtonText: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing(8),
  },
  skipText: {
    fontSize: fs(14),
    color: '#9ca3af',
    fontWeight: '500',
  },
});
