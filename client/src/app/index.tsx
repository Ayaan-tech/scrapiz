import { View } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthService } from '../api/apiService';
import { useLocalization } from '../context/LocalizationContext';
import { useTheme } from '../context/ThemeContext';
import SplashScreen from '../components/SplashScreen';


export default function IndexScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { isLanguageSet, isLoading: isLanguageLoading } = useLocalization();
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthCheckDone, setIsAuthCheckDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    const runInitialChecks = async () => {
      try {
        const authStatus = await AuthService.isAuthenticated();
        if (isActive) setIsAuthenticated(authStatus);
      } catch (error) {
        console.error("Auth check failed", error);
        if (isActive) setIsAuthenticated(false);
      } finally {
        if (isActive) setIsAuthCheckDone(true);
      }
    };
    runInitialChecks();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    // Wait for splash screen, auth check, and language initialization to complete
    if (showSplash || !isAuthCheckDone || isLanguageLoading) return;

    // Prevent duplicate navigation - only navigate once from index
    if (hasNavigatedRef.current) {
      console.log('🛑 Navigation already performed, skipping...');
      return;
    }

    // Check if we're still on the index route - if not, don't navigate
    // This prevents race conditions when auth state changes after user already navigated
    const currentRoute = '/' + segments.join('/');
    if (segments.length > 0 && currentRoute !== '/') {
      console.log('🛑 Already navigated away from index, skipping navigation. Current:', currentRoute);
      hasNavigatedRef.current = true;
      return;
    }

    let routeToNavigate = ""

    /**
     * Navigation Flow Priority:
     * Priority 0: Language Selection (highest priority)
     *   - First-time users must select language before anything else
     *   - Returning users skip this step (language already set)
     * 
     * Priority 1: Home Screen (GUEST-ACCESSIBLE)
     *   - All users (authenticated and guests) go to home
     *   - Authentication is now CONTEXTUAL - triggered only when needed
     *   - This follows modern e-commerce patterns (browse before buy)
     * 
     * Note: Auth checks are now handled by:
     * - useAuthGuard hook for protected actions
     * - Individual screens that require authentication
     * - Sell flow auth gate at step 3
     */

    // Priority 0: Check language selection first
    if (!isLanguageSet) {
      console.log('➡️ Navigating to: language-selection (no language set)');
      routeToNavigate = '/(auth)/language-selection';
    }
    // Priority 1: Always go to home (guests welcome!)
    else {
      console.log('➡️ Navigating to: tabs/home (guest-accessible entry)');
      routeToNavigate = '/(tabs)/home';
      // Note: Auth state is still tracked for conditional UI rendering,
      // but no longer blocks app entry
    }

    console.log('🚀 Navigation Debug:', {
      isLanguageSet,
      isAuthenticated,
    });

    if (routeToNavigate) {
      hasNavigatedRef.current = true;
      router.replace(routeToNavigate);
    }
  }, [
    showSplash,
    isAuthCheckDone,
    isLanguageLoading,
    isLanguageSet,
    isAuthenticated,
    router,
    segments
  ]);

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  )
}

