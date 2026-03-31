import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { ArrowLeft, Calendar, Clock, Shield, CheckCircle, Star } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '../(tabs)/services';
import { getServiceBookingRoute } from './serviceRoutingConfig';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { wp, hp, fs, spacing } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServiceDetailsScreen() {
  const { service: serviceId } = useLocalSearchParams<{ service?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();

  const service = services.find(s => s.id === serviceId);
  
  // Get localized service details
  const getServiceDetails = (serviceId: string) => {
    const serviceKey = serviceId
    .split('-')
    .map((word, index) => 
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('');
  
  return {
    included: [
      t(`services.${serviceKey}.included1`),
      t(`services.${serviceKey}.included2`),
      t(`services.${serviceKey}.included3`),
      t(`services.${serviceKey}.included4`),
      t(`services.${serviceKey}.included5`),
    ],
    howItWorks: [
      t(`services.${serviceKey}.step1`),
      t(`services.${serviceKey}.step2`),
      t(`services.${serviceKey}.step3`),
      t(`services.${serviceKey}.step4`),
    ],
  };
  };
  
  const details = service ? getServiceDetails(service.id) : { included: [], howItWorks: [] };


  const handleBookNow = () => {
    if (!service) return;
    router.push({
      pathname: getServiceBookingRoute(service.id),
      params: { service: service.id } 
    } as any);
  };

  // If service not found, show error state
  if (!service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.header, { 
          paddingTop: Platform.OS === 'android' ? insets.top + spacing(12) : insets.top + spacing(8) 
        }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <ArrowLeft size={fs(24)} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing(20) }}>
          <Text style={{ fontSize: fs(18), color: colors.textSecondary, textAlign: 'center' }}>
            {t('services.serviceNotFound')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { 
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top + spacing(12) : insets.top + spacing(8) 
      }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <ArrowLeft size={fs(24)} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(20) + insets.bottom }}
      >
        <View style={styles.contentContainer}>

            <View style={[styles.heroCard, { backgroundColor: isDark ? colors.card : service.bgColor }]}>
                <View style={[styles.heroIcon, { backgroundColor: service.color }]}>
                    <service.icon size={fs(34)} color="white" />
                </View>
                <Text style={[styles.heroTitle, { color: service.color }]}>{t(service.titleKey)}</Text>
                <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>{t(service.descKey)}</Text>
                <View style={styles.tagsContainer}>
                    <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}><Shield size={fs(14)} color={colors.textSecondary} /><Text style={[styles.tagText, { color: colors.textSecondary }]}>{t('services.insured')}</Text></View>
                    <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}><Clock size={fs(14)} color={colors.textSecondary} /><Text style={[styles.tagText, { color: colors.textSecondary }]}>{t('services.fast')}</Text></View>
                    <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}><Star size={fs(14)} color={colors.textSecondary} /><Text style={[styles.tagText, { color: colors.textSecondary }]}>4.8 ★</Text></View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('services.whatsIncluded')}</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {details.included.map((item: string, index: number) => (
                    <View key={index} style={styles.listItem}>
                        <CheckCircle size={fs(18)} color={colors.primary} />
                        <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('services.howItWorks')}</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {details.howItWorks.map((item: string, index: number) => (
                    <View key={index} className='flex-row items-start gap-4 py-2.5'>
                        <View style={ { backgroundColor: service.color }} className='w-7 h-7 rounded-full justify-center items-center -mt-[2px] '>
                            <Text className='text-white font-bold font-inter-bold text-[15px]'>{index + 1}</Text>
                        </View>
                        <Text style={[styles.stepText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                    ))}
                </View>
            </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { 
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing(16)) + spacing(8)
      }]}>
        <TouchableOpacity 
          style={ { backgroundColor: service.color }} 
          className='flex-row justify-center items-center p-4 rounded-2xl gap-3'
          onPress={handleBookNow}
        >
          <Calendar size={fs(22)} color="white" />
          <Text style={styles.bookButtonText}>{t('services.bookThisService')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(16),
    paddingBottom: spacing(12),
  },
  backButton: {
    padding: spacing(8),
    borderRadius: spacing(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
      paddingHorizontal: spacing(16),
      paddingTop: spacing(8),
  },
  heroCard: {
      borderRadius: spacing(16),
      paddingVertical: spacing(20),
      paddingHorizontal: spacing(20),
      alignItems: 'center',
      marginBottom: spacing(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
  },
  heroIcon: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(8),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing(10),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 6,
  },
  heroTitle: {
      fontSize: fs(20),
      fontWeight: 'bold',
      fontFamily: 'Inter-Bold',
      marginBottom: spacing(6),
      textAlign: 'center',
  },
  heroDescription: {
      fontSize: fs(13),
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      marginBottom: spacing(16),
      lineHeight: fs(20),
      paddingHorizontal: spacing(8),
  },
  tagsContainer: {
      flexDirection: 'row',
      gap: spacing(10),
  },
  tag: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: spacing(16),
      paddingVertical: spacing(6),
      paddingHorizontal: spacing(12),
      gap: spacing(6),
      borderWidth: 1,
  },
  tagText: {
      fontSize: fs(13),
      fontFamily: 'Inter-Medium',
  },
  section: {
    marginBottom: spacing(20),
  },
  sectionTitle: {
    fontSize: fs(17),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginBottom: spacing(12),
    paddingLeft: spacing(2),
  },
  card: {
    borderRadius: spacing(12),
    padding: spacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(12),
    paddingVertical: spacing(8),
  },
  listItemText: {
    flex: 1,
    fontSize: fs(14),
    fontFamily: 'Inter-Regular',
    lineHeight: fs(20),
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(14),
    paddingVertical: spacing(8),
  },
  stepNumber: {
      width: wp(8),
      height: wp(8),
      borderRadius: wp(4),
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing(2),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
  },
  stepNumberText: {
      color: 'white',
      fontWeight: 'bold',
      fontFamily: 'Inter-Bold',
      fontSize: fs(14),
  },
  stepText: {
    flex: 1,
    fontSize: fs(14),
    fontFamily: 'Inter-Regular',
    lineHeight: fs(20),
  },
  footer: {
    paddingTop: spacing(16),
    paddingHorizontal: spacing(16),
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(16),
    borderRadius: spacing(12),
    gap: spacing(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonText: {
    color: 'white',
    fontSize: fs(17),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
});
