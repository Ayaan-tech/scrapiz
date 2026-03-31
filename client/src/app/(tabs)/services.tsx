import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { wp, hp, fs, spacing } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import TutorialOverlay from '@/src/components/TutorialOverlay';
import { useTutorialStore } from '@/src/store/tutorialStore';
import ServiceCard from '@/src/components/ServiceCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServiceBookingRoute } from '../services/serviceRoutingConfig';

const { width } = Dimensions.get('window');

// ─────────────── SERVICE DATA ───────────────
export interface ServiceData {
  id: string;
  title: string;
  titleKey: string;
  descKey: string;
  image: ImageSourcePropType;
  borderColor: string;
  cardBgColor: string;
  gradientColors: [string, string, string];
  included: string[];
  color: string;
  bgColor: string;
  icon: any;
}

const DummyIcon = () => null;

export const services: ServiceData[] = [
  {
    id: 'demolition',
    title: 'Demolition Service',
    titleKey: 'services.demolitionTitle',
    descKey: 'services.demolitionDesc',
    image: require('../../../assets/images/services/deomlition_app.webp'),
    borderColor: '#1a7c3a',
    cardBgColor: '#ffffff',
    gradientColors: ['transparent', 'rgba(247,253,249,0.6)', '#f7fdf9'],
    included: [
      'On-site assessment and quote.',
      'Eco-friendly disposal.',
      'Clean-up after completion.',
    ],
    color: '#1a7c3a',
    bgColor: '#f0fdf4',
    icon: DummyIcon,
  },
  {
    id: 'dismantling',
    title: 'Vehicle Scrapping',
    titleKey: 'services.dismantlingTitle',
    descKey: 'services.dismantlingDesc',
    image: require('../../../assets/images/services/carScrap_app.webp'),
    borderColor: '#c0392b',
    cardBgColor: '#ffffff',
    gradientColors: ['transparent', 'rgba(254,247,247,0.6)', '#fef7f7'],
    included: [
      'Pre-dismantling safety inspection.',
      'Segregation of materials for recycling.',
      'Site clearance and certification.',
    ],
    color: '#c0392b',
    bgColor: '#fef2f2',
    icon: DummyIcon,
  },
  {
    id: 'paper-shredding',
    title: 'Corporate Tieup',
    titleKey: 'services.paperShreddingTitle',
    descKey: 'services.paperShreddingDesc',
    image: require('../../../assets/images/services/corporateTieup.webp'),
    borderColor: '#1558a8',
    cardBgColor: '#ffffff',
    gradientColors: ['transparent', 'rgba(245,249,254,0.6)', '#f5f9fe'],
    included: [
      'Office, factory and industry waste collection plans.',
      'Compliance-ready pickups with reporting support.',
      'Scheduled tie-up programs for multi-location teams.',
    ],
    color: '#1558a8',
    bgColor: '#eff6ff',
    icon: DummyIcon,
  },
  {
    id: 'society-tieup',
    title: 'Society Tie-up',
    titleKey: 'services.societyTieupTitle',
    descKey: 'services.societyTieupDesc',
    image: require('../../../assets/images/services/society_Tieup_app.webp'),
    borderColor: '#1558a8',
    cardBgColor: '#ffffff',
    gradientColors: ['transparent', 'rgba(245,249,254,0.6)', '#f5f9fe'],
    included: [
      'Regular collection drives (weekly/bi-weekly).',
      'Monthly reports on environmental impact.',
      'Awareness programs for residents on segregation.',
    ],
    color: '#1558a8',
    bgColor: '#eff6ff',
    icon: DummyIcon,
  },
  {
    id: 'junk-removal',
    title: 'Debris Removal',
    titleKey: 'services.junkRemovalTitle',
    descKey: 'services.junkRemovalDesc',
    image: require('../../../assets/images/services/debris_removal.webp'),
    borderColor: '#c0440a',
    cardBgColor: '#ffffff',
    gradientColors: ['transparent', 'rgba(254,248,243,0.6)', '#fef8f3'],
    included: [
      'Responsible disposal, donation, or recycling.',
      'All labor for lifting and loading included.',
      'Same-day or next-day service available.',
    ],
    color: '#c0440a',
    bgColor: '#fff7ed',
    icon: DummyIcon,
  },
];

// ─────────────── MAIN SCREEN ───────────────
export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();

  const { setStepTarget, currentScreen } = useTutorialStore();
  const overviewRef    = useRef<View>(null);
  const serviceCardsRef = useRef<View>(null);
  const detailsRef     = useRef<View>(null);
  const bookingRef     = useRef<View>(null);

  useEffect(() => {
    if (currentScreen === 'services') {
      const timer = setTimeout(() => {
        overviewRef.current?.measure((x, y, w, h, pageX, pageY) => {
          if (w > 0 && h > 0) setStepTarget('services-overview', { x: pageX, y: pageY, width: w, height: h });
        });
        serviceCardsRef.current?.measure((x, y, w, h, pageX, pageY) => {
          if (w > 0 && h > 0) setStepTarget('services-cards', { x: pageX, y: pageY, width: w, height: h });
        });
        detailsRef.current?.measure((x, y, w, h, pageX, pageY) => {
          if (w > 0 && h > 0) setStepTarget('services-details', { x: pageX, y: pageY, width: w, height: h });
        });
        bookingRef.current?.measure((x, y, w, h, pageX, pageY) => {
          if (w > 0 && h > 0) setStepTarget('services-booking', { x: pageX, y: pageY, width: w, height: h });
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, setStepTarget]);

  const handleLearnMore = (service: ServiceData) => {
    router.push(`/services/${service.id}`);
  };

  const handleBookNow = (service: ServiceData) => {
    router.push({
      pathname: getServiceBookingRoute(service.id),
      params: { service: service.id },
    } as any);
  };

  // Header gradient — simple green like the screenshot
  const headerGradient: [string, string, string] = isDark
    ? ['#081a12', '#0d3020', '#164a2e']
    : ['#2d7a4a', '#3d9960', '#6dbb88'];

  const pageBg = isDark ? '#0f172a' : '#eef1f0';

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ─── HEADER ─── */}
      <LinearGradient
        colors={headerGradient}
        style={[styles.headerSection, { paddingTop: insets.top + spacing(14) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View ref={overviewRef} style={styles.headerInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={fs(24)} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Our Services</Text>

          {/* Spacer to keep title centered */}
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {/* ─── CARD LIST ─── */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View ref={serviceCardsRef}>
          {services.map((service, index) => (
            <View
              key={service.id}
              ref={index === 0 ? bookingRef : index === 1 ? detailsRef : null}
            >
              <ServiceCard
                title={service.title}
                accentColor={service.color}
                image={service.image}
                included={service.included}
                onLearnMore={() => handleLearnMore(service)}
                onBookNow={() => handleBookNow(service)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <TutorialOverlay />
    </View>
  );
}

// ─────────────── STYLES ───────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  headerSection: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2.5),
  },

  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
  },

  // ── Scroll ──
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing(16),
    paddingBottom: Platform.OS === 'android' ? spacing(110) : spacing(90),
  },
});
