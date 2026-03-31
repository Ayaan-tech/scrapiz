import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  ImageBackground,
  Easing,
  StatusBar,
} from 'react-native';
import {
  User,
  Mail,
  Lock,
  Eye,
  ArrowLeft,
  EyeOff,
  ArrowRight,
  Phone,
  Gift,
  Sparkles,
  Check,
} from 'lucide-react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService } from '../../api/apiService';
import Toast from 'react-native-toast-message';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { wp, hp, fs, spacing } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

// Promo Code OTP Input Component (8 boxes with hyphen after 4)
const PromoCodeInput = ({
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
    // Parse value without hyphen
    const cleanValue = value.replace(/-/g, '');
    const newDigits = cleanValue.split('').slice(0, 8);
    while (newDigits.length < 8) newDigits.push('');
    setDigits(newDigits);
  }, [value]);

  const handleChange = (text: string, index: number) => {
    const newText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (newText.length <= 1) {
      const newDigits = [...digits];
      newDigits[index] = newText;
      setDigits(newDigits);

      // Format with hyphen: XXXX-XXXX
      const left = newDigits.slice(0, 4).join('');
      const right = newDigits.slice(4, 8).join('');
      const formatted = right ? `${left}-${right}` : left;
      onChange(formatted);

      // Auto-focus next input
      if (newText && index < 7) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={promoStyles.container}>
      <View style={promoStyles.boxRow}>
        {digits.slice(0, 4).map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[promoStyles.box, digit && promoStyles.boxFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            maxLength={1}
            autoCapitalize="characters"
            editable={!disabled}
            keyboardType="default"
            selectTextOnFocus
          />
        ))}
      </View>
      <Text style={promoStyles.hyphen}>-</Text>
      <View style={promoStyles.boxRow}>
        {digits.slice(4, 8).map((digit, index) => (
          <TextInput
            key={index + 4}
            ref={(ref) => (inputRefs.current[index + 4] = ref)}
            style={[promoStyles.box, digit && promoStyles.boxFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text, index + 4)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index + 4)}
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

const promoStyles = StyleSheet.create({
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

// Starlight particle for success animation
const StarlightParticle = ({ delay, angle, distance }: { delay: number; angle: number; distance: number }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;

  return (
    <Animated.View
      style={[
        starStyles.particle,
        {
          transform: [
            { translateX: x },
            { translateY: y },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={starStyles.particleDot} />
    </Animated.View>
  );
};

const starStyles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
  particleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
});

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setAuthenticatedState } = useAuth();

  // Steps: 1 = Basic Details, 2 = Phone + Promo, 3 = OTP Verification, 4 = Success
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    promoCode: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  const { signInWithGoogle, isLoading: isGoogleLoading, error: googleError, authSuccess } = useGoogleAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlide = useRef(new Animated.Value(height)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  // OTP resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 3 && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, resendCountdown]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    cardSlide.setValue(height);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Success animation
  useEffect(() => {
    if (currentStep === 4) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(loadingProgress, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(async () => {
        // Navigate to sell screen after animation - user is already authenticated
        const { hasShownNotificationPermission } = await import('../../utils/notificationPermission');
        const hasShown = await hasShownNotificationPermission();

        let destination = '/(tabs)/sell';
        if (returnTo) {
          destination = decodeURIComponent(returnTo);
        }

        if (!hasShown) {
          router.replace('/notification-permission');
        } else {
          router.replace(destination as any);
        }
      });
    }
  }, [currentStep]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/[\s\-()]/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    // Promo code is optional, but if entered must be 8 characters
    if (formData.promoCode && formData.promoCode.replace(/-/g, '').length !== 8) {
      newErrors.promoCode = 'Promo code must be 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStep1Continue = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleStep2Continue = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);

    try {
      const registerData: any = {
        email: formData.email.trim(),
        name: formData.fullName.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        phone: formData.phone.trim(),
      };

      if (formData.promoCode) {
        registerData.promo_code = formData.promoCode.replace(/-/g, '').toUpperCase();
      }

      await AuthService.register(registerData);

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'Please check your email for verification code',
      });

      // Reset countdown for OTP
      setResendCountdown(60);
      setCanResendOtp(false);

      // Move to OTP verification step
      setCurrentStep(3);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.message || 'Unable to create account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter a valid 6-digit OTP',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await AuthService.verifyOtp({
        email: formData.email.trim(),
        otp,
      });

      // Set auth state - the JWT is already stored by AuthService.verifyOtp
      setAuthenticatedState(true);

      Toast.show({
        type: 'success',
        text1: 'Verified!',
        text2: 'Your account has been activated',
      });

      // Small delay to ensure auth state propagates
      await new Promise(resolve => setTimeout(resolve, 200));

      // Show success animation
      setCurrentStep(4);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Invalid OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setIsLoading(true);

    try {
      await AuthService.resendOtp(formData.email.trim());

      Toast.show({
        type: 'success',
        text1: 'OTP Resent',
        text2: 'A new verification code has been sent',
      });

      // Reset countdown
      setResendCountdown(60);
      setCanResendOtp(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Unable to resend OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-up error:', error);
    }
  };

  useEffect(() => {
    const handleAuthSuccess = async () => {
      if (authSuccess) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Sign up successful!' });

        // Update auth state
        setAuthenticatedState(true);

        const { hasShownNotificationPermission } = await import('../../utils/notificationPermission');
        const hasShown = await hasShownNotificationPermission();
        await new Promise(resolve => setTimeout(resolve, 200));

        let destination = '/(tabs)/sell';
        if (returnTo) {
          destination = decodeURIComponent(returnTo);
        }

        if (!hasShown) {
          router.replace('/notification-permission');
        } else {
          router.replace(destination as any);
        }
      }
    };

    handleAuthSuccess();
  }, [authSuccess, returnTo]);

  useEffect(() => {
    if (googleError) {
      Toast.show({ type: 'error', text1: 'Error', text2: googleError });
    }
  }, [googleError]);

  const isanyLoading = isLoading || isGoogleLoading;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  // Get background image based on step
  const getBackgroundImage = () => {
    if (currentStep === 2) {
      return require('../../../assets/images/lets-get-u-starte.jpeg');
    }
    return require('../../../assets/images/create-ur-accoun.jpeg');
  };

  // Get step content
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Tell us about yourself';
      case 2: return 'Your basic details';
      case 3: return 'Verify your email';
      case 4: return 'Your account has been created!';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1: return 'We need some info to get you started';
      case 2: return 'We use this to schedule scrap pickup';
      case 3: return `Enter the 6-digit code sent to ${formData.email}`;
      case 4: return 'Welcome to Scrapiz family';
      default: return '';
    }
  };

  // Success Screen
  if (currentStep === 4) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={['#052e1c', '#064e3b', '#065f46']}
          style={styles.successGradient}
        >
          <View style={styles.successContent}>
            {/* Starlight Animation */}
            <Animated.View
              style={[
                styles.successIconContainer,
                {
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                },
              ]}
            >
              {/* Starlight particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <StarlightParticle
                  key={i}
                  delay={i * 100}
                  angle={i * 30}
                  distance={60 + (i % 3) * 20}
                />
              ))}

              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <Sparkles size={48} color="#fbbf24" />
                </View>
              </View>
            </Animated.View>

            <Animated.Text
              style={[styles.successTitle, { opacity: successOpacity }]}
            >
              Your account has been{'\n'}created!
            </Animated.Text>

            <Animated.Text
              style={[styles.successSubtitle, { opacity: successOpacity }]}
            >
              Welcome to Scrapiz family 🌱
            </Animated.Text>

            {/* Loading Progress */}
            <Animated.View style={[styles.loadingContainer, { opacity: successOpacity }]}>
              <View style={styles.loadingTrack}>
                <Animated.View
                  style={[
                    styles.loadingBar,
                    {
                      width: loadingProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.loadingText}>Let's start selling! 🚀</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // OTP Verification Screen (Step 3)
  if (currentStep === 3) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient
          colors={['#052e1c', '#064e3b', '#065f46']}
          style={styles.successGradient}
        >
          {/* Back Button - outside ScrollView for proper absolute positioning */}
          <TouchableOpacity
            style={styles.backButtonFloat}
            onPress={() => setCurrentStep(2)}
            disabled={isLoading}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.otpScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.otpContent}>
                {/* Mail Icon */}
                <View style={styles.otpIconContainer}>
                  <Mail size={48} color="#22c55e" />
                </View>

                <Text style={styles.otpTitle}>Verify Your Email</Text>
                <Text style={styles.otpSubtitle}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={styles.otpEmail}>{formData.email}</Text>
                </Text>

                {/* OTP Input */}
                <View style={styles.otpInputContainer}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    editable={!isLoading}
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOtp}
                  disabled={!canResendOtp || isLoading}
                >
                  <Text style={[styles.resendText, !canResendOtp && styles.resendTextDisabled]}>
                    {canResendOtp
                      ? "Didn't receive code? Resend"
                      : `Resend code in ${resendCountdown}s`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
        <Toast />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={getBackgroundImage()}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
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
              {/* Logo */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Text style={styles.logoText}>Scrapiz</Text>
              </Animated.View>

              {/* Card */}
              <Animated.View
                style={[
                  styles.card,
                  { transform: [{ translateY: cardSlide }] },
                ]}
              >
                {/* Back Button */}
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setCurrentStep(currentStep - 1)}
                    disabled={isanyLoading}
                  >
                    <ArrowLeft size={20} color="#6b7280" />
                  </TouchableOpacity>
                )}

                {/* Progress Header */}
                <View style={styles.progressHeader}>
                  <Text style={styles.stepText}>Step {currentStep} of {totalSteps}</Text>
                  <Text style={styles.percentText}>{progressPercent}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                </View>

                {/* Title */}
                <Text style={styles.cardTitle}>{getStepTitle()}</Text>
                <Text style={styles.cardSubtitle}>{getStepSubtitle()}</Text>

                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <>
                    {/* Full Name */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, errors.fullName && styles.inputError]}
                        placeholder="Full Name"
                        placeholderTextColor="#9ca3af"
                        value={formData.fullName}
                        onChangeText={(text) => handleInputChange('fullName', text)}
                        autoCapitalize="words"
                        editable={!isanyLoading}
                      />
                      {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                    </View>

                    {/* Email */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, errors.email && styles.inputError]}
                        placeholder="Email address"
                        placeholderTextColor="#9ca3af"
                        value={formData.email}
                        onChangeText={(text) => handleInputChange('email', text.toLowerCase())}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isanyLoading}
                      />
                      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Password */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.passwordWrapper, errors.password && styles.inputError]}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Password"
                          placeholderTextColor="#9ca3af"
                          value={formData.password}
                          onChangeText={(text) => handleInputChange('password', text)}
                          secureTextEntry={!showPassword}
                          editable={!isanyLoading}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                        </TouchableOpacity>
                      </View>
                      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.passwordWrapper, errors.confirmPassword && styles.inputError]}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Confirm Password"
                          placeholderTextColor="#9ca3af"
                          value={formData.confirmPassword}
                          onChangeText={(text) => handleInputChange('confirmPassword', text)}
                          secureTextEntry={!showConfirmPassword}
                          editable={!isanyLoading}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {/* Continue Button */}
                    <TouchableOpacity
                      style={[styles.continueButton, isanyLoading && styles.buttonDisabled]}
                      onPress={handleStep1Continue}
                      disabled={isanyLoading}
                    >
                      <Text style={styles.continueButtonText}>Continue</Text>
                      <ArrowRight size={18} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}

                {/* Step 2: Phone + Promo */}
                {currentStep === 2 && (
                  <>
                    {/* Phone Number */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, errors.phone && styles.inputError]}
                        placeholder="Mobile Number"
                        placeholderTextColor="#9ca3af"
                        value={formData.phone}
                        onChangeText={(text) => handleInputChange('phone', text)}
                        keyboardType="phone-pad"
                        editable={!isanyLoading}
                      />
                      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Promo Code Section */}
                    <View style={styles.promoSection}>
                      <View style={styles.promoHeader}>
                        <Gift size={20} color="#22c55e" />
                        <Text style={styles.promoLabel}>Have a promo code? (Optional)</Text>
                      </View>

                      <PromoCodeInput
                        value={formData.promoCode}
                        onChange={(text) => handleInputChange('promoCode', text)}
                        disabled={isanyLoading}
                      />

                      {formData.promoCode.replace(/-/g, '').length === 8 && (
                        <View style={styles.promoSuccessContainer}>
                          <Check size={16} color="#22c55e" />
                          <Text style={styles.promoSuccessText}>
                            You'll get ₹10 bonus instantly on sign-up!
                          </Text>
                        </View>
                      )}
                      {errors.promoCode && <Text style={styles.errorText}>{errors.promoCode}</Text>}
                    </View>

                    {/* Terms Checkbox */}
                    <TouchableOpacity
                      style={styles.termsContainer}
                      onPress={() => setTermsAccepted(!termsAccepted)}
                      disabled={isanyLoading}
                    >
                      <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                        {termsAccepted && <Check size={14} color="#fff" />}
                      </View>
                      <Text style={styles.termsText}>
                        I agree to <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
                      </Text>
                    </TouchableOpacity>

                    {/* Create Account Button */}
                    <TouchableOpacity
                      style={[
                        styles.continueButton,
                        (!termsAccepted || isanyLoading) && styles.buttonDisabled,
                      ]}
                      onPress={handleStep2Continue}
                      disabled={!termsAccepted || isanyLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.continueButtonText}>Create Account</Text>
                          <ArrowRight size={18} color="#fff" />
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {/* Already have account */}
                <View style={styles.footerContainer}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity disabled={isanyLoading}>
                      <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  gradientOverlay: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? hp(12) : hp(10),
    paddingBottom: spacing(24),
    flex: 1,
    minHeight: hp(22),
  },
  logoText: {
    fontSize: fs(58),
    fontWeight: '800',
    color: '#22c55e',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 12,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: spacing(28),
    borderTopRightRadius: spacing(28),
    paddingHorizontal: spacing(24),
    paddingTop: spacing(24),
    paddingBottom: Platform.OS === 'ios' ? spacing(40) : spacing(32),
    minHeight: hp(70),
  },
  backButton: {
    position: 'absolute',
    top: spacing(16),
    left: spacing(16),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonFloat: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(8),
    marginTop: spacing(8),
  },
  stepText: {
    fontSize: fs(14),
    color: '#6b7280',
    fontWeight: '500',
  },
  percentText: {
    fontSize: fs(14),
    color: '#6b7280',
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: spacing(24),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  cardTitle: {
    fontSize: fs(24),
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: spacing(6),
  },
  cardSubtitle: {
    fontSize: fs(14),
    color: '#6b7280',
    marginBottom: spacing(24),
  },
  inputContainer: { marginBottom: spacing(16) },
  input: {
    height: hp(6),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: spacing(12),
    paddingHorizontal: spacing(16),
    fontSize: fs(15),
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  inputError: { borderColor: '#ef4444' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: hp(6),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: spacing(12),
    backgroundColor: '#f9fafb',
    paddingHorizontal: spacing(16),
  },
  passwordInput: {
    flex: 1,
    fontSize: fs(15),
    color: '#1f2937',
  },
  errorText: {
    fontSize: fs(12),
    color: '#ef4444',
    marginTop: spacing(4),
    marginLeft: spacing(4),
  },
  continueButton: {
    height: hp(6),
    backgroundColor: '#22c55e',
    borderRadius: spacing(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(8),
    marginBottom: spacing(20),
  },
  buttonDisabled: { opacity: 0.5 },
  continueButtonText: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#fff',
  },
  promoSection: {
    marginBottom: spacing(20),
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(8),
    marginBottom: spacing(16),
  },
  promoLabel: {
    fontSize: fs(14),
    color: '#374151',
    fontWeight: '500',
  },
  promoSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(6),
    marginTop: spacing(12),
    backgroundColor: '#f0fdf4',
    paddingHorizontal: spacing(12),
    paddingVertical: spacing(8),
    borderRadius: spacing(8),
    alignSelf: 'center',
  },
  promoSuccessText: {
    fontSize: fs(13),
    color: '#16a34a',
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(10),
    marginBottom: spacing(20),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  termsText: {
    fontSize: fs(14),
    color: '#6b7280',
  },
  termsLink: {
    color: '#16a34a',
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(6),
  },
  footerText: {
    fontSize: fs(14),
    color: '#6b7280',
  },
  footerLink: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#16a34a',
  },
  // OTP Screen Styles
  otpScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(24),
  },
  otpContent: {
    alignItems: 'center',
  },
  otpIconContainer: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(24),
  },
  otpTitle: {
    fontSize: fs(28),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing(12),
  },
  otpSubtitle: {
    fontSize: fs(15),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing(32),
    lineHeight: fs(22),
  },
  otpEmail: {
    color: '#86efac',
    fontWeight: '600',
  },
  otpInputContainer: {
    width: '100%',
    marginBottom: spacing(24),
  },
  otpInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing(16),
    height: hp(8),
    fontSize: fs(32),
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  verifyButton: {
    width: '100%',
    height: hp(6.5),
    backgroundColor: '#22c55e',
    borderRadius: spacing(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(8),
    marginBottom: spacing(20),
  },
  verifyButtonText: {
    fontSize: fs(17),
    fontWeight: '700',
    color: '#fff',
  },
  resendButton: {
    padding: spacing(12),
  },
  resendText: {
    fontSize: fs(14),
    color: '#86efac',
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  // Success Screen Styles
  successGradient: {
    flex: 1,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(32),
  },
  successIconContainer: {
    marginBottom: spacing(40),
    position: 'relative',
    width: wp(32),
    height: wp(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconOuter: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  successIconInner: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: fs(32),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing(12),
    lineHeight: fs(40),
  },
  successSubtitle: {
    fontSize: fs(16),
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: spacing(48),
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loadingTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing(16),
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  loadingText: {
    fontSize: fs(14),
    color: 'rgba(255, 255, 255, 0.7)',
  },
});