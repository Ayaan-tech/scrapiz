import React, { useState, useMemo, useEffect , useRef} from 'react';
import { View, Text,StyleSheet,ScrollView,TouchableOpacity,Dimensions,Image,Platform,ActivityIndicator,RefreshControl,Share,Linking,Alert,} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Share2,
  User,
} from 'lucide-react-native';
//Components
import CustomCarousel from '../../components/Carousel';
import LocationSelector from '@/src/components/LocationSelector';
import SearchBar from '@/src/components/SearchBar';
import { RemoteImage } from '../../components/RemoteImage';
import TutorialOverlay from '@/src/components/TutorialOverlay';
import RateAppBottomSheet from '@/src/components/RateAppBottomSheet';
import RatingToast from '@/src/components/RatingToast';
import NetworkRetryOverlay from '../../components/NetworkRetryOverlay';
//Hooks
import { useHomeDataWithRetry } from '../../hooks/useHomeDataWithRetry';
import { useLocalization } from '../../context/LocalizationContext';
import { useTheme } from '../../context/ThemeContext';
import { useAppRating } from '../../hooks/useAppRating';
import { useOrderRatingToast } from '../../hooks/useOrderRatingToast';
import { wp, hp, fs } from '../../utils/responsive';
import { getAvatarSource } from '../../utils/avatarUtils';
//Tutorial
import { homeTutorialConfig } from '@/src/config/tutorials/homeTutorial';
import { useTutorialStore } from '@/src/store/tutorialStore';

function formatAMPM(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesString = minutes < 10 ? '0' + minutes : minutes;
  const strTime = hours + ':' + minutesString + ' ' + ampm;
  return strTime;
}


export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { 
    user, 
    products, 
    loading, 
    refetch,
    // Network retry state
    showRetryOverlay,
    countdown,
    isRetrying,
    hasFailedPermanently,
    errorMessage,
    retryNow,
  } = useHomeDataWithRetry();
  const [refreshing, setRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();

  // App Rating System Integration (Requirements: 1.3, 1.4, 7.1)
  const {
    state: appRatingState,
    checkEligibility,
    showRatingPrompt,
    handleRateNow,
    handleRemindLater,
    handleNeverAskAgain,
    dismissBottomSheet,
  } = useAppRating();

  // Order Rating Toast Integration (Requirements: 3.1, 3.2, 3.3, 3.4, 3.5)
  const {
    state: orderRatingState,
    checkPendingRatings,
    handleRateNow: handleOrderRateNow,
    handleLater: handleOrderLater,
    dismissToast: dismissOrderRatingToast,
  } = useOrderRatingToast();

  // Tutorial system integration
  const { setStepTarget, currentScreen } = useTutorialStore();
  const locationRef = useRef<View>(null);
  const searchRef = useRef<View>(null);
  const ratesRef = useRef<View>(null);

  const featuredMarketProducts = useMemo(() => {
    const allProducts = products || [];
    const findProduct = (terms: string[]) =>
      allProducts.find((product) => {
        const name = product.name.toLowerCase();
        return terms.some((term) => name.includes(term));
      });

    const formatRate = (product?: typeof allProducts[number], fallbackUnit = 'kg') =>
      product ? `₹${product.min_rate}-${product.max_rate}/${product.unit}` : `Check rates/${fallbackUnit}`;

    return [
      {
        id: 'window-ac',
        title: '1 ton Window AC',
        image: findProduct(['window ac'])?.image_url
          ? { uri: findProduct(['window ac'])?.image_url as string }
          : require('../../../assets/images/Scrap_Rates_Photos/WindowAC.jpg'),
        rate: formatRate(findProduct(['window ac']), 'piece'),
      },
      {
        id: 'copper',
        title: 'Copper',
        image: findProduct(['copper'])?.image_url
          ? { uri: findProduct(['copper'])?.image_url as string }
          : require('../../../assets/images/Scrap_Rates_Photos/Copper.jpg'),
        rate: formatRate(findProduct(['copper'])),
      },
      {
        id: 'newspaper',
        title: 'Newspaper',
        image: findProduct(['newspaper'])?.image_url
          ? { uri: findProduct(['newspaper'])?.image_url as string }
          : require('../../../assets/images/Scrap_Rates_Photos/Newspaper.jpg'),
        rate: formatRate(findProduct(['newspaper'])),
      },
      {
        id: 'plastics',
        title: 'Plastics',
        image: findProduct(['plastic'])?.image_url
          ? { uri: findProduct(['plastic'])?.image_url as string }
          : require('../../../assets/images/Scrap_Rates_Photos/Plastics.jpg'),
        rate: formatRate(findProduct(['plastic'])),
      },
    ];
  }, [products]);

  const referralShareMessage = `Join me on Scrapiz and sell scrap smarter.${user?.referral_code ? ` Use my referral code: ${user.referral_code}` : ''}\n\nPlay Store: https://play.google.com/store/apps/details?id=com.scrapiz.app\nApp Store: https://apps.apple.com/in/app/scrapiz-sell-scrap-online/id6756441850`;

  // Get user initials for fallback
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Error handling is now done by NetworkRetryOverlay - no toast needed
  // The overlay shows a professional retry UI instead of disruptive toasts

  // App Rating Eligibility Check (Requirements: 7.1)
  // Check eligibility when home screen loads and show prompt after 2-second delay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const checkAndShowRatingPrompt = async () => {
      // Wait for home data to finish loading before checking eligibility
      if (loading) return;

      try {
        const isEligible = await checkEligibility();
        
        // If eligible and component is still mounted, show prompt after 2-second delay
        // Requirement 7.1: Display after 2-second delay when eligible
        if (isEligible && isMounted) {
          timeoutId = setTimeout(() => {
            if (isMounted) {
              showRatingPrompt();
            }
          }, 2000);
        }
      } catch (err) {
        // Fail silently - don't disrupt user experience
        console.error('App rating eligibility check failed:', err);
      }
    };

    checkAndShowRatingPrompt();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, checkEligibility, showRatingPrompt]);

  // Order Rating Toast Check (Requirements: 3.1, 3.3)
  // Check for pending ratings when home screen loads
  useEffect(() => {
    let isMounted = true;

    const checkOrderRatings = async () => {
      // Wait for home data to finish loading before checking
      if (loading) return;

      try {
        if (isMounted) {
          await checkPendingRatings();
        }
      } catch (err) {
        // Fail silently - don't disrupt user experience
        console.error('Order rating check failed:', err);
      }
    };

    checkOrderRatings();

    return () => {
      isMounted = false;
    };
  }, [loading, checkPendingRatings]);

  /**
   * Handle "Rate Now" button press on order rating toast
   * Navigates to the order details page
   * Requirements: 3.4
   */
  const onOrderRateNow = () => {
    const pendingOrder = handleOrderRateNow();
    if (pendingOrder) {
      // Navigate to order details page
      router.push(`/profile/orders/${pendingOrder.order_id}` as any);
    }
  };

  /**
   * Handle "Later" button press on order rating toast
   * Stores cooldown timestamp (72 hours)
   * Requirements: 3.3, 3.5
   */
  const onOrderLater = async () => {
    await handleOrderLater();
  };

  // Measure element positions when tutorial is active
  useEffect(() => {
    if (currentScreen === 'home') {
      // Small delay to ensure elements are rendered
      const measureTimeout = setTimeout(() => {
        // Measure location selector
        locationRef.current?.measure((x, y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setStepTarget('home-location', { x: pageX, y: pageY, width, height });
          }
        });

        // Measure search bar
        searchRef.current?.measure((x, y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setStepTarget('home-search', { x: pageX, y: pageY, width, height });
          }
        });

        // Measure rates section
        ratesRef.current?.measure((x, y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            setStepTarget('home-rates', { x: pageX, y: pageY, width, height });
          }
        });
      }, 100);

      return () => clearTimeout(measureTimeout);
    }
  }, [currentScreen, setStepTarget]);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  const handleNavigate = (path: string) => {
    router.push(path as any);
  }

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: referralShareMessage,
        title: 'Scrapiz Referral',
      });
    } catch (error) {
      Alert.alert('Share unavailable', referralShareMessage);
    }
  };

  const handleContactSupport = async () => {
    const gmailUrl = 'googlegmail://co?to=support@scrapiz.in';
    const mailUrl = 'mailto:support@scrapiz.in';
    const canOpenGmail = await Linking.canOpenURL(gmailUrl);
    if (canOpenGmail) {
      await Linking.openURL(gmailUrl);
      return;
    }
    const canOpenMail = await Linking.canOpenURL(mailUrl);
    if (canOpenMail) {
      await Linking.openURL(mailUrl);
      return;
    }
    Alert.alert('Contact Support', 'support@scrapiz.in');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors?.background || '#f1f5f9' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={[styles.loadingText, { color: colors?.text || '#111827' }]}>{t('home.loading')}</Text>
      </View>
    );
  }
  console.log('Update ID:', Updates.updateId);
  console.log('Runtime version:', Updates.runtimeVersion);
  console.log('Channel:', Updates.channel);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#16a34a']} 
          />
        }
      >
        {/* Combined Header Section with Green Background */}
        <LinearGradient 
          colors={colors.headerGradient} 
          style={styles.headerSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={[styles.decorativeCircle1, { opacity: isDark ? 0.05 : 0.1 }]} />
          <View style={[styles.decorativeCircle2, { opacity: isDark ? 0.05 : 0.08 }]} />
          <View style={[styles.decorativeCircle3, { opacity: isDark ? 0.03 : 0.06 }]} />
          
          {/* Top Row: Location & Profile */}
          <View style={styles.topRow}>
            {/* Location Selector */}
            <View style={styles.locationContainer} ref={locationRef}>
              <LocationSelector  />
            </View>

            {/* Right Side: Profile */}
            <View style={styles.rightContainer}>
              {/* Coins Badge - Hidden for future use */}
              {/* <TouchableOpacity 
                style={styles.coinsContainer}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/rewards-wallet' as any)}
              >
                <View style={styles.coinsIconWrapper}>
                  <Coins size={16} color="#f59e0b" strokeWidth={2.8} />
                </View>
                <Text style={styles.coinsText}>120</Text>
              </TouchableOpacity> */}

              {/* Profile Icon */}
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.7}
              >
                {(() => {
                  // Use getAvatarSource to determine avatar display
                  // Priority: profile_image > DiceBear avatar > initials
                  const avatarSource = getAvatarSource({
                    profile_image: imageError ? null : user?.profile_image,
                    avatar_provider: user?.avatar_provider,
                    avatar_style: user?.avatar_style,
                    avatar_seed: user?.avatar_seed,
                  }, 80);

                  if (avatarSource) {
                    // Check if it's a DiceBear URL (for using ExpoImage with better caching)
                    const isDiceBearUrl = avatarSource.uri.includes('api.dicebear.com');
                    
                    if (isDiceBearUrl) {
                      return (
                        <ExpoImage
                          source={{ uri: avatarSource.uri }}
                          style={styles.profileImage}
                          contentFit="cover"
                          transition={200}
                          onError={() => setImageError(true)}
                        />
                      );
                    }
                    
                    return (
                      <Image
                        source={{ uri: avatarSource.uri }}
                        style={styles.profileImage}
                        onError={() => setImageError(true)}
                      />
                    );
                  }
                  
                  // Fallback to initials or user icon
                  if (user?.name) {
                    return (
                      <View style={[
                        styles.profileInitials,
                        { backgroundColor: isDark ? '#166534' : '#16a34a' }
                      ]}>
                        <Text style={{ 
                            fontSize: fs(14), 
                            fontWeight: 'bold', 
                            color: '#ffffff'
                        }}>
                          {getInitials(user.name) || 'U'}
                        </Text>
                      </View>
                    );
                  }
                  
                  return (
                    <View style={[
                      styles.profileIconWrapper,
                      { backgroundColor: isDark ? '#166534' : '#16a34a' }
                    ]}>
                      <User size={fs(20)} color="#ffffff" strokeWidth={2.8} />
                    </View>
                  );
                })()}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer} ref={searchRef}>
            <View style={[
                styles.searchInnerWrapper, 
                { backgroundColor: colors.searchBarBackground }
             ]}>
                <SearchBar isDark={isDark} /> 
             </View>
          </View>
        </LinearGradient>

        <View style={styles.homeBody}>
          <CustomCarousel />

          <TouchableOpacity style={styles.heroBannerCard} onPress={() => handleNavigate('/(tabs)/sell')} activeOpacity={0.9}>
            <Image source={require('../../../assets/images/home/home_second_banner.webp')} style={styles.heroBannerImage} resizeMode="cover" />
          </TouchableOpacity>

          <View style={styles.marketSection} ref={ratesRef}>
            <View style={styles.marketHeader}>
              <Text style={[styles.marketHeaderText, { color: colors.text }]}>Market Rates Today</Text>
              <TouchableOpacity onPress={() => handleNavigate('/(tabs)/rates')}>
                <ChevronRight size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketCardsRow}>
              {featuredMarketProducts.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.marketProductCard,
                    {
                      backgroundColor: isDark ? '#1B2535' : '#FFFFFF',
                      borderColor: isDark ? '#2F3B4E' : '#E2E8F0',
                      marginRight: index === featuredMarketProducts.length - 1 ? 0 : 10,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleNavigate('/(tabs)/rates')}
                >
                  <View style={styles.marketProductImageWrap}>
                    <Image source={item.image as any} style={styles.marketProductImage} resizeMode="contain" />
                  </View>
                  <View style={styles.marketProductTextBlock}>
                    <Text style={[styles.marketProductName, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.marketProductRate}>{item.rate}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.imagePromoCard} onPress={() => handleNavigate('/(tabs)/services')} activeOpacity={0.92}>
            <Image source={require('../../../assets/images/home/demolition_site_converted.webp')} style={styles.imagePromo} resizeMode="cover" />
            <View style={styles.imagePromoOverlay}>
              <TouchableOpacity style={styles.imagePromoButton} onPress={() => handleNavigate('/(tabs)/services')} activeOpacity={0.9}>
                <Text style={styles.imagePromoButtonText}>Schedule Now</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imagePromoCard} onPress={handleShareApp} activeOpacity={0.92}>
            <Image source={require('../../../assets/images/home/refer_and_Earn.webp')} style={styles.imagePromo} resizeMode="cover" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.imagePromoCard, styles.contactPromoCard, styles.lastPromoCard]} onPress={handleContactSupport} activeOpacity={0.92}>
            <Image source={require('../../../assets/images/home/contact_us.webp')} style={styles.contactPromoImage} resizeMode="cover" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast />
      <TutorialOverlay />
      
      {/* Order Rating Toast (Requirements: 3.1, 3.2, 3.3, 3.4, 3.5) */}
      <RatingToast
        visible={orderRatingState.showToast}
        agentName={orderRatingState.pendingOrder?.agent_name || ''}
        onRateNow={onOrderRateNow}
        onLater={onOrderLater}
        onDismiss={dismissOrderRatingToast}
      />
      
      {/* App Rating Bottom Sheet (Requirements: 1.2, 1.3, 1.4, 7.1) */}
      <RateAppBottomSheet
        visible={appRatingState.showBottomSheet}
        onRateNow={handleRateNow}
        onRemindLater={handleRemindLater}
        onNeverAskAgain={handleNeverAskAgain}
        onDismiss={dismissBottomSheet}
      />

      {/* Network Retry Overlay - Shows when network issues occur */}
      <NetworkRetryOverlay
        visible={showRetryOverlay}
        countdown={countdown}
        isRetrying={isRetrying}
        hasFailedPermanently={hasFailedPermanently}
        errorMessage={errorMessage || undefined}
        onRetryNow={retryNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  // New consolidated header section
  headerSection: {
    paddingTop: hp(6.8),
    paddingHorizontal: wp(4.8),
    paddingBottom: hp(3.5), // Increased bottom padding slightly for visual balance
    borderBottomLeftRadius: 28, // Slightly rounder looks more modern
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    // Remove shadow here, let the gradient do the work
  },
  searchInnerWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow creates separation from the green header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: wp(58.7), // 220
    height: wp(58.7), // 220
    borderRadius: wp(29.3), // 110
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: hp(-7.4), // -60
    right: wp(-16), // -60
    opacity: 0.6,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: wp(42.7), // 160
    height: wp(42.7), // 160
    borderRadius: wp(21.3), // 80
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: hp(-4.9), // -40
    left: wp(-10.7), // -40
    opacity: 0.5,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: wp(26.7), // 100
    height: wp(26.7), // 100
    borderRadius: wp(13.3), // 50
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: hp(4.9), // 40
    left: wp(26.7), // 100
    opacity: 0.4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.7), // 14
  },
  locationContainer: {
    // Don't let location take the full row; allow it to shrink
    flexGrow: 0,
    flexShrink: 1,
    marginRight: wp(4.3), // 16
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.7), // 10
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingLeft: wp(1.3), // Reduced from 1.6
    paddingRight: wp(2.7), // Reduced from 3.2
    paddingVertical: hp(0.6), // Reduced from 0.7
    borderRadius: 20,
    gap: wp(1.3), // Reduced from 1.6
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  coinsIconWrapper: {
    width: wp(6), // Reduced from 6.9
    height: wp(6), // Reduced from 6.9
    backgroundColor: '#fef3c7',
    borderRadius: wp(3), // Reduced from 3.5
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsText: {
    fontSize: fs(13), // Reduced from 14
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter-ExtraBold',
    letterSpacing: -0.3,
  },
  profileButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    justifyContent: 'center',
    alignItems: 'center',
    // Removed hardcoded shadow/border colors to use inline styles based on mode
    elevation: 4,
    marginLeft: wp(1.1),
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: wp(5),
  },
  profileInitials: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: wp(5),
  },
  profileIconWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: wp(5),
  },
  searchBarContainer: {
    marginBottom: hp(1), // 8
  },
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4.3), // 16
    paddingVertical: hp(2), // 16
    gap: wp(2.7), // 10
    marginTop: hp(-1.2), // -10
  },

  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: wp(2.7), // Reduced from 3.2
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconContainer: {
    width: wp(8), // Reduced from 9.6
    height: wp(8), // Reduced from 9.6
    backgroundColor: '#f0fdf4',
    borderRadius: wp(4), // Reduced from 4.8
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.6), // Reduced from 0.7
  },
  statValue: {
    fontSize: fs(15), // Reduced from 16
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: hp(0.2), // 2
  },
  statLabel: {
    fontSize: fs(9), // Reduced from 10
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  searchSection: {
    paddingHorizontal: wp(5.3), // 20
    paddingVertical: hp(2), // 16
    backgroundColor: 'white',
  },
  header: {
    paddingTop: hp(7.4), // 60
    paddingHorizontal: wp(5.3), // 20
    paddingBottom: hp(3), // 24
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  section: {
    paddingHorizontal: wp(5.3), // 20
    paddingVertical: hp(1.5), // 12
  },
  homeBody: {
    paddingTop: hp(1.2),
    paddingBottom: hp(3),
  },
  heroBannerCard: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  heroBannerImage: {
    width: '100%',
    height: hp(18),
  },
  marketSection: {
    paddingTop: hp(1.8),
    paddingBottom: hp(1.2),
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5.3),
    marginBottom: hp(1.6),
  },
  marketHeaderText: {
    fontSize: fs(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  marketCardsRow: {
    paddingHorizontal: wp(5.3),
    paddingBottom: hp(0.8),
  },
  marketProductCard: {
    width: wp(27),
    minHeight: hp(12.5),
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: hp(0.8),
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  marketProductImageWrap: {
    width: '100%',
    height: hp(7.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.45),
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  marketProductImage: {
    width: '100%',
    height: '100%',
  },
  marketProductTextBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: hp(0.35),
    paddingHorizontal: wp(1.8),
  },
  marketProductName: {
    fontSize: fs(11.5),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: fs(13.5),
    minHeight: hp(2.9),
  },
  marketProductRate: {
    fontSize: fs(10.8),
    fontWeight: '700',
    color: '#16a34a',
    textAlign: 'center',
    lineHeight: fs(12.8),
  },
  imagePromoCard: {
    marginHorizontal: wp(4),
    marginTop: hp(2),
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lastPromoCard: {
    marginBottom: hp(1.5),
  },
  contactPromoCard: {
    minHeight: hp(24),
  },
  imagePromo: {
    width: '100%',
    height: hp(18.5),
  },
  contactPromoImage: {
    width: '100%',
    height: hp(24),
  },
  imagePromoOverlay: {
    position: 'absolute',
    left: wp(4),
    bottom: hp(2.2),
  },
  imagePromoButton: {
    backgroundColor: '#1F9A42',
    borderRadius: 999,
    paddingHorizontal: wp(4.2),
    paddingVertical: hp(0.9),
    shadowColor: '#1F9A42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  imagePromoButtonText: {
    color: '#FFFFFF',
    fontSize: fs(12),
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.7), // 14
    gap: wp(2.1), // 8
  },
  sectionBadge: {
    paddingHorizontal: wp(2.1), // 8
    paddingVertical: hp(0.4), // 3
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: fs(10), // 10
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2), // 16
  },
  sectionTitle: {
    fontSize: fs(17), // Reduced from 18
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.3,
  },
  ratesScrollView: {
    paddingBottom: hp(2), // 8px bottom spacing - reduced
  },

  ratesScrollContent: {
    paddingHorizontal: wp(5.3), // 20
  },
rateCard: {
    // INCREASED WIDTH: from wp(28) to wp(36) to fit text
    width: wp(36), 
    minHeight: hp(18), // Fixed height ensures alignment
    borderRadius: 20,
    padding: wp(3),
    marginRight: wp(3.2),
    alignItems: 'center',
    justifyContent: 'space-between', // Distributes content evenly
    borderWidth: 1,
    // Improved Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  rateIconContainer: {
    width: wp(16),   // CHANGED: Increased from wp(12) to match card size
    height: wp(16),  // CHANGED: Increased height
    borderRadius: wp(8), // Half of width to keep it circular
    backgroundColor: '#f1f5f9', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5), // Small gap between icon and text
  },
  itemImage: {
    width: wp(9),   // CHANGED: Increased from wp(7) for better visibility
    height: wp(9),  // CHANGED: Increased height
    resizeMode: 'contain',
  },
 categoryName: {
    fontSize: fs(12),
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: hp(0.5),   // Reduced slightly since icon is bigger
    marginBottom: hp(1.5),
    textAlignVertical: 'center',
  },
  
  priceBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)', // Light green background
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRate: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#16a34a',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: wp(3.2), // 12
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionCardGradient: {
    paddingVertical: hp(2.5), // Use vertical padding instead of just padding
    paddingHorizontal: wp(2),
    alignItems: 'center',
    minHeight: hp(13),      // CHANGED: Reduced from 15 to 13 to remove empty space
    justifyContent: 'center',
  },
  actionIcon: {
    marginBottom: hp(1.2),
  },
  actionTitle: {
    fontSize: fs(16),       // CHANGED: Increased from 14 to 16 for better readability
    fontWeight: '800',      // Made bolder
    fontFamily: 'Inter-ExtraBold',
    marginBottom: hp(0.2), 
    textAlign: 'center',    // Ensures text stays centered
  },
  actionSubtitle: {
    fontSize: fs(11),       // CHANGED: Increased from 10 to 11
    fontFamily: 'Inter-Medium',
    opacity: 0.9,
    textAlign: 'center',
  },
  moreServicesText: {
    fontSize: fs(14), // 14
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
  },
  viewAllText: {
    fontSize: fs(14), // 14
    color: '#16a34a',
    fontFamily: 'Inter-Medium',
  },
  servicesList: {
    gap: wp(3.2), // 12
  },
  serviceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceCardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: wp(3.5), // Reduced from 4
  },
  serviceIconContainer: {
    width: wp(11), // Reduced from 12.8
    height: wp(11), // Reduced from 12.8
    borderRadius: wp(5.5), // Reduced from 6.4
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2.7), // Reduced from 3.2
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceInfo: {
    flex: 1,
    marginRight: wp(2.7), // 10
  },
  serviceTitle: {
    fontSize: fs(15), // Reduced from 16
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: hp(0.3), // 2
    letterSpacing: -0.2,
  },
  serviceDescription: {
    fontSize: fs(12), // Reduced from 13
    fontFamily: 'Inter-Regular',
    opacity: 0.95,
    lineHeight: fs(16), // Reduced from 18
  },
  impactSection: {
    marginTop: hp(1), // 8
    marginBottom: hp(0.5), // Reduced from 1.2 to decrease gap with branding
  },
  impactCard: {
    borderRadius: 20,
    padding: wp(6.4), // 24
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  impactIconContainer: {
    width: wp(16), // 60
    height: wp(16), // 60
    borderRadius: wp(8), // 30
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(4.3), // 16
  },
  impactEmoji: {
    fontSize: fs(32), // 32
  },
  impactTextContainer: {
    flex: 1,
  },
  impactText: {
    fontSize: fs(15), // 15
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: hp(2.7), // 22
    marginBottom: hp(1.5), // 12
  },
  impactHighlight: {
    fontWeight: '800',
    color: '#ffffff',
    fontSize: fs(16), // 16
  },
  impactStats: {
    flexDirection: 'row',
    gap: wp(2.7), // 10
    marginTop: hp(0.5), // 4
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: wp(3.2), // 12
    paddingVertical: hp(0.7), // 6
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statBadgeText: {
    fontSize: fs(12), // 12
    fontWeight: '700',
    color: '#ffffff',
  },
  referCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, 
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      }
    }),
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  referCardGradient: {
    borderRadius: 20,
    padding: wp(4.8), // 18
    flexDirection: 'row',
    alignItems: 'center',
  },
  referIconContainer: {
    width: wp(12.8), // 48
    height: wp(12.8), // 48
    backgroundColor: 'white',
    borderRadius: wp(6.4), // 24
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  referTextContainer: {
    flex: 1,
    marginHorizontal: wp(3.7), // 14
  },
  referTitle: {
    fontSize: fs(15), // 15
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginBottom: hp(0.4), // 3
  },
  referSubtitle: {
    fontSize: fs(12), // 12
    fontFamily: 'Inter-Medium',
  },
  tipCard: {
    borderRadius: 16,
    padding: wp(5.3), // 20
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.2), // Reduced from 0.6 to decrease gap
  },
  tipIconContainer: {
    width: wp(14.9), // 56
    height: wp(14.9), // 56
    backgroundColor: '#ffffff',
    borderRadius: wp(7.5), // 28
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tipTextContainer: {
    flex: 1,
    marginLeft: wp(4.3), // 16
  },
  tipTitle: {
    fontSize: fs(14), // 14
    fontWeight: '600',
    color: '#047857',
    fontFamily: 'Inter-SemiBold',
    marginBottom: hp(0.5), // 4
  },
  tipText: {
    fontSize: fs(13), // 13
    color: '#065f46',
    fontFamily: 'Inter-Regular',
    lineHeight: hp(2.2), // 18
  },
  // Branding Section
    brandingSection: {
      marginTop: 0,
      marginBottom: wp(5.3), // 20
      marginHorizontal: wp(5.3), // 20
      overflow: 'hidden',
      borderRadius: 24,
    },
    brandingGradient: {
      paddingVertical: hp(4.9), // 40
      paddingHorizontal: wp(6.4), // 24
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
    },
    brandingCircle1: {
      position: 'absolute',
      width: wp(80), // 300
      height: wp(80), // 300
      borderRadius: wp(40), // 150
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      top: hp(-12.3), // -100
      right: wp(-21.3), // -80
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.15)',
    },
    brandingCircle2: {
      position: 'absolute',
      width: wp(66.7), // 250
      height: wp(66.7), // 250
      borderRadius: wp(33.3), // 125
      backgroundColor: 'rgba(59, 130, 246, 0.06)',
      bottom: hp(-9.8), // -80
      left: wp(-16), // -60
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.12)',
    },
    brandingContent: {
      position: 'relative',
      zIndex: 1,
    },
    brandingBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.15)',
      paddingHorizontal: wp(3.7), // 14
      paddingVertical: hp(0.7), // 6
      borderRadius: 18,
      alignSelf: 'flex-start',
      marginBottom: hp(2.2), // 18
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.3)',
    },
    brandingBadgeText: {
      fontSize: fs(11), // 11
      fontWeight: '800',
      color: '#16a34a',
      letterSpacing: 1.2,
    },
    brandingTagline: {
      fontSize: fs(32), // 32
      fontWeight: '900',
      color: '#ffffff',
      textAlign: 'left',
      letterSpacing: -1,
      lineHeight: hp(4.9), // 40
    },
    brandingDivider: {
      width: wp(18.7), // 70
      height: 3,
      backgroundColor: '#16a34a',
      borderRadius: 2,
      marginVertical: hp(2.2), // 18
      alignSelf: 'flex-start', // Align divider to the left
    },
    brandingLogoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: hp(1.2), // 10
    backgroundColor: 'transparent',
  },
  brandingLogoImage: {
    width: wp(55), // Reduced from 75 to make it smaller
    height: hp(8), // Reduced from 11 to make it smaller
    marginLeft: wp(-2), // Move more to the left
    ...(Platform.OS === 'ios' && {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    }),
  },
  brandingSubtext: {
    fontSize: fs(15), // 15
    color: '#94a3b8',
    fontWeight: '600',
  },
  brandingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: wp(5.3), // 20
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandingStat: {
    flex: 1,
    alignItems: 'center',
  },
  brandingStatNumber: {
    fontSize: fs(24), // 24
    fontWeight: '800',
    color: '#10b981',
    marginBottom: hp(0.5), // 4
  },
  brandingStatLabel: {
    fontSize: fs(11), // 11
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  brandingStatDivider: {
    width: 1,
    height: hp(4.9), // 40
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: wp(3.2), // 12
  },
});
