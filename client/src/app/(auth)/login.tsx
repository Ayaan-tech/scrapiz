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
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  X,
  Link as LinkIcon,
} from 'lucide-react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthService } from '../../api/apiService';
import Toast from 'react-native-toast-message';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useAppleAuth, AppleAuthError } from '../../hooks/useAppleAuth';
import { useLocalization } from '../../context/LocalizationContext';
import { wp, hp, fs, spacing } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useAuth } from '../../context/AuthContext';
import { ForceUpdateModal } from '../../components/ForceUpdateModal';
import { checkAppVersion } from '../../utils/versionCheck';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLocalization();
  const { colors, isDark } = useTheme();
  const { setAuthenticatedState, refreshAuthStatus } = useAuth();

  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');
  const [minVersion, setMinVersion] = useState('1.0.0');

  const { signInWithGoogle, isLoading: isGoogleLoading, error: googleError, authSuccess } = useGoogleAuth();

  const {
    signInWithApple,
    confirmAccountLink,
    isLoading: isAppleLoading,
    error: appleError,
    errorType: appleErrorType,
    authSuccess: appleAuthSuccess,
    isAvailable: isAppleAvailable,
    pendingLinkEmail,
    clearError: clearAppleError,
  } = useAppleAuth();

  const [showLinkConfirmModal, setShowLinkConfirmModal] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlide = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const versionCheck = await checkAppVersion();
        if (versionCheck.force_update) {
          setShowForceUpdate(true);
          setUpdateUrl(versionCheck.update_url);
          setMinVersion(versionCheck.min_app_version);
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };
    checkVersion();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
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
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const navigateAfterAuth = async () => {
    const { hasShownNotificationPermission } = await import('../../utils/notificationPermission');
    const hasShown = await hasShownNotificationPermission();
    await new Promise(resolve => setTimeout(resolve, 100));

    let destination = '/(tabs)/home';
    if (returnTo) {
      const decodedReturnTo = decodeURIComponent(returnTo);
      destination = decodedReturnTo;
    }

    if (!hasShown) {
      router.replace('/notification-permission');
    } else {
      router.replace(destination as any);
    }
  };

  useEffect(() => {
    if (authSuccess) {
      Toast.show({ type: 'success', text1: t('common.success'), text2: 'Signed in successfully!' });
      const dest = returnTo
        ? `/(auth)/oauth-phone-details?returnTo=${encodeURIComponent(returnTo)}`
        : '/(auth)/oauth-phone-details';
      router.replace(dest as any);
    }
  }, [authSuccess]);

  useEffect(() => {
    if (appleAuthSuccess) {
      Toast.show({ type: 'success', text1: t('common.success'), text2: 'Signed in with Apple successfully!' });
      const dest = returnTo
        ? `/(auth)/oauth-phone-details?returnTo=${encodeURIComponent(returnTo)}`
        : '/(auth)/oauth-phone-details';
      router.replace(dest as any);
    }
  }, [appleAuthSuccess]);

  useEffect(() => {
    if (pendingLinkEmail) setShowLinkConfirmModal(true);
  }, [pendingLinkEmail]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid email';
    if (!password.trim()) newErrors.password = 'Password is required';
    else if (password.trim().length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (isLoading) return;
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await AuthService.login({ email: email.trim(), password: password.trim() });

      // Update auth state in context immediately
      setAuthenticatedState(true);

      Toast.show({ type: 'success', text1: 'Success', text2: 'Signed in successfully!' });

      // Small delay to ensure auth state propagates
      await new Promise(resolve => setTimeout(resolve, 200));

      await navigateAfterAuth();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Sign In Failed', text2: error.message || 'Unable to sign in' });
    }
  };

  const handleAppleLogin = async () => {
    try {
      clearAppleError();
      await signInWithApple();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Sign In Failed', text2: error.message || 'Unable to sign in' });
    }
  };

  const handleConfirmLink = async (confirmed: boolean) => {
    setShowLinkConfirmModal(false);
    if (!confirmed) {
      await confirmAccountLink(false);
      return;
    }
    try {
      const success = await confirmAccountLink(true);
      if (!success) {
        Toast.show({ type: 'error', text1: 'Linking Failed', text2: 'Unable to link accounts' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Linking Failed', text2: error.message });
    }
  };

  useEffect(() => {
    if (googleError) Toast.show({ type: 'error', text1: 'Sign In Failed', text2: googleError });
  }, [googleError]);

  useEffect(() => {
    if (appleError && appleErrorType && appleErrorType !== AppleAuthError.CANCELLED) {
      if (appleErrorType === AppleAuthError.LINK_CANCELLED) {
        Toast.show({ type: 'info', text1: 'Linking Cancelled', text2: 'You can create a new account instead' });
      } else {
        Toast.show({ type: 'error', text1: 'Sign In Failed', text2: appleError });
      }
    }
  }, [appleError, appleErrorType]);

  const isAnyLoading = isLoading || isGoogleLoading || isAppleLoading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../../assets/images/create-ur-accoun.jpeg')}
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

              {/* Login Card */}
              <Animated.View
                style={[
                  styles.card,
                  { transform: [{ translateY: cardSlide }] },
                ]}
              >
                <Text style={styles.cardTitle}>Welcome back to{'\n'}your account</Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Email address"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={(text) => { setEmail(text.toLowerCase()); setErrors(p => ({ ...p, email: undefined })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    editable={!isAnyLoading}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={[styles.passwordWrapper, errors.password && styles.inputError]}>
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.passwordInput}
                      placeholder="Password"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={(text) => { setPassword(text); setErrors(p => ({ ...p, password: undefined })); }}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      editable={!isAnyLoading}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Forgot Password */}
                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity style={styles.forgotButton} disabled={isAnyLoading}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </Link>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.signInButton, isAnyLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isAnyLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.signInButtonText}>Sign In</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Buttons Row */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[styles.socialButton, isAnyLoading && styles.buttonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isAnyLoading}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator color="#1f2937" size="small" />
                    ) : (
                      <>
                        <Image
                          source={require('../../../assets/images/GoogleFavicon.png')}
                          style={styles.socialIcon}
                          resizeMode="contain"
                        />
                        {Platform.OS === 'android' && (
                          <Text style={styles.socialButtonText}>Continue with Google</Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && isAppleAvailable && (
                    <TouchableOpacity
                      style={[styles.socialButton, styles.appleButton, isAnyLoading && styles.buttonDisabled]}
                      onPress={handleAppleLogin}
                      disabled={isAnyLoading}
                    >
                      {isAppleLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Image
                          source={require('../../../assets/images/apple_image.png')}
                          style={styles.appleIcon}
                          resizeMode="contain"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Create Account Link */}
                <View style={styles.createAccountContainer}>
                  <Text style={styles.noAccountText}>No account?</Text>
                  <Link href="/(auth)/register" asChild>
                    <TouchableOpacity style={styles.createAccountButton} disabled={isAnyLoading}>
                      <Text style={styles.createAccountText}>Let's create one</Text>
                      <ArrowRight size={16} color="#16a34a" />
                    </TouchableOpacity>
                  </Link>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>

      {/* Account Linking Modal */}
      <Modal visible={showLinkConfirmModal} transparent animationType="fade" onRequestClose={() => handleConfirmLink(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => handleConfirmLink(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.modalIconContainer}>
              <LinkIcon size={32} color="#16a34a" />
            </View>
            <Text style={styles.modalTitle}>Link Your Account?</Text>
            <Text style={styles.modalMessage}>
              An account with {pendingLinkEmail} already exists. Link your Apple ID to this account?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => handleConfirmLink(false)}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => handleConfirmLink(true)}>
                <Text style={styles.modalButtonConfirmText}>Link Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ForceUpdateModal visible={showForceUpdate} updateUrl={updateUrl} minVersion={minVersion} />
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
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: spacing(32),
    borderTopRightRadius: spacing(32),
    paddingHorizontal: spacing(24),
    paddingTop: spacing(32),
    paddingBottom: Platform.OS === 'ios' ? spacing(40) : spacing(32),
    minHeight: hp(65),
  },
  cardTitle: {
    fontSize: fs(32),
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: spacing(28),
    lineHeight: fs(42),
  },
  inputContainer: { marginBottom: spacing(16) },
  input: {
    height: hp(6.5),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: spacing(12),
    paddingHorizontal: spacing(16),
    fontSize: fs(16),
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  inputError: { borderColor: '#ef4444' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: hp(6.5),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: spacing(12),
    backgroundColor: '#f9fafb',
    paddingHorizontal: spacing(16),
  },
  passwordInput: {
    flex: 1,
    fontSize: fs(16),
    color: '#1f2937',
  },
  eyeButton: { padding: spacing(4) },
  errorText: {
    fontSize: fs(12),
    color: '#ef4444',
    marginTop: spacing(4),
    marginLeft: spacing(4),
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing(24),
  },
  forgotText: {
    fontSize: fs(14),
    color: '#16a34a',
    fontWeight: '600',
  },
  signInButton: {
    height: hp(6.5),
    backgroundColor: '#22c55e',
    borderRadius: spacing(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(8),
    marginBottom: spacing(24),
  },
  buttonDisabled: { opacity: 0.6 },
  signInButtonText: {
    fontSize: fs(17),
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(20),
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: {
    fontSize: fs(13),
    color: '#9ca3af',
    paddingHorizontal: spacing(12),
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing(12),
    marginBottom: spacing(28),
  },
  socialButton: {
    flex: 1,
    height: hp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: spacing(12),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    gap: spacing(8),
  },
  socialIcon: { width: Platform.OS === 'android' ? wp(6) : wp(10), height: Platform.OS === 'android' ? wp(6) : wp(10) },
  socialButtonText: {
    fontSize: fs(15),
    fontWeight: '600',
    color: '#1f2937',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  appleIcon: { width: wp(8), height: wp(8), tintColor: '#fff' },
  appleButtonText: {
    fontSize: fs(15),
    fontWeight: '600',
    color: '#fff',
  },
  createAccountContainer: {
    alignItems: 'center',
    gap: spacing(8),
  },
  noAccountText: {
    fontSize: fs(15),
    color: '#6b7280',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(6),
    backgroundColor: '#f0fdf4',
    paddingHorizontal: spacing(20),
    paddingVertical: spacing(12),
    borderRadius: spacing(24),
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  createAccountText: {
    fontSize: fs(15),
    fontWeight: '700',
    color: '#16a34a',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(24),
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: spacing(20),
    padding: spacing(24),
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing(16),
    right: spacing(16),
  },
  modalIconContainer: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(16),
  },
  modalTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: spacing(12),
  },
  modalMessage: {
    fontSize: fs(14),
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: spacing(24),
    lineHeight: fs(20),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing(12),
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    height: hp(5.5),
    borderRadius: spacing(12),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: fs(15),
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonConfirm: {
    flex: 1,
    height: hp(5.5),
    borderRadius: spacing(12),
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: fs(15),
    fontWeight: '700',
    color: '#fff',
  },
});
