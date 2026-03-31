import React from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function SocietyTieupLearnMoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const ui = {
    bg: isDark ? '#0F1320' : '#FFFFFF',
    title: isDark ? '#F7F8FA' : '#101010',
    muted: isDark ? '#A9B2C0' : '#787878',
    primary: '#1414A5',
    border: isDark ? '#344050' : '#D9D9D9',
    card: isDark ? '#172032' : '#F3F8FF',
    soft: isDark ? '#1C2438' : '#F2F2F2',
    pill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
  };

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: ui.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={26} color={ui.muted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: ui.title }]}>Society Tie - Up</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.bannerWrap}>
          <Image source={require('../../../assets/images/services/society_tieup/society_tieup_banner.webp')} style={styles.bannerImage} resizeMode="cover" />
        </View>

        <View style={[styles.statsCard, { borderColor: ui.border, backgroundColor: ui.soft }]}>
          {[
            ['140 +', 'Societies\nonboarded'],
            ['82 T', 'Waste\ncollected'],
            ['4.9 -', 'Secretary\nrating'],
          ].map(([value, label], index) => (
            <View key={value} style={[styles.statCol, index < 2 && { borderRightWidth: 1, borderRightColor: ui.border }]}>
              <Text style={[styles.statValue, { color: ui.primary }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: ui.muted }]}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>WHY SOCIETIES CHOOSE US ?</Text>
        <View style={[styles.reasonCard, { backgroundColor: ui.soft }]}>
          <Text style={[styles.reasonTitle, { color: ui.primary }]}>Zero scheduling effort</Text>
          <Text style={[styles.reasonText, { color: ui.muted }]}>Drives auto-scheduled. Secretary just monitors from app.</Text>
        </View>

        <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>HOW IT WORKS ?</Text>
        <View style={styles.timeline}>
          {[
            ['1', 'Submit free enquiry', 'Tell us about your society - takes 2 minutes.', 'Today'],
            ['2', 'We visit & propose', 'Free site visit, custom plan + pricing sent.', '3 - 5 days'],
            ['3', 'First drive scheduled', 'Sign digitally, your society goes eco-clean.', '~ 2 weeks'],
          ].map(([step, title, desc, pill], index) => (
            <View key={step} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={styles.timelineDot}><Text style={[styles.timelineDotText, { color: ui.primary }]}>{step}</Text></View>
                {index < 2 && <View style={[styles.timelineLine, { backgroundColor: '#8ED1FF' }]} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: ui.primary }]}>{title}</Text>
                <Text style={[styles.timelineDesc, { color: ui.muted }]}>{desc}</Text>
                <View style={styles.timelinePill}><Text style={[styles.timelinePillText, { color: ui.primary }]}>{pill}</Text></View>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>WHAT SECRETARIES SAYS ?</Text>
        <View style={[styles.testimonialCard, { backgroundColor: '#DDF1FF', borderColor: '#8ED1FF' }]}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={[styles.testimonialText, { color: ui.primary }]}>
            Residents used to dump waste randomly. After this tie-up, segregation compliance went from 20% to 78% in just 3 months.
          </Text>
          <View style={styles.testimonialFooter}>
            <View style={[styles.avatarCircle, { backgroundColor: ui.primary }]}><Text style={styles.avatarText}>RS</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.personName, { color: ui.primary }]}>Ramesh S.</Text>
              <Text style={[styles.personRole, { color: '#79C5F8' }]}>Secretary</Text>
            </View>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={22} fill="#F5C84B" color="#F5C84B" />)}
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.ctaButton, { backgroundColor: ui.primary }]} onPress={() => router.push('/services/society-tieup-book')}>
          <Text style={styles.ctaText}>Submit an enquiry</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 76, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, position: 'relative' },
  backButton: { position: 'absolute', left: 14, top: 22, padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  content: { paddingBottom: 28 },
  bannerWrap: { height: 250, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', inset: 0, paddingHorizontal: 28, paddingTop: 20, justifyContent: 'center' },
  bannerEyebrow: { color: '#7C8ABA', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  bannerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  bannerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  bannerPill: { borderWidth: 1, borderColor: '#D7E4FF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.08)' },
  bannerPillText: { color: '#D7E4FF', fontSize: 14, fontWeight: '700' },
  statsCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 17, marginTop: 4 },
  sectionEyebrow: { fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  reasonCard: { marginHorizontal: 16, borderRadius: 20, padding: 22 },
  reasonTitle: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  reasonText: { fontSize: 14, fontWeight: '700', lineHeight: 18, maxWidth: 260 },
  timeline: { marginHorizontal: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timelineLeft: { width: 60, alignItems: 'center' },
  timelineDot: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DDF1FF', borderWidth: 1, borderColor: '#8ED1FF', alignItems: 'center', justifyContent: 'center' },
  timelineDotText: { fontSize: 18, fontWeight: '800' },
  timelineLine: { width: 2, flex: 1, marginVertical: 6 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineTitle: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  timelineDesc: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginTop: 4, maxWidth: 220 },
  timelinePill: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: '#8ED1FF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#EAF6FF' },
  timelinePillText: { fontSize: 13, fontWeight: '700' },
  testimonialCard: { marginHorizontal: 16, borderRadius: 24, borderWidth: 1, padding: 18, marginTop: 8 },
  quoteMark: { color: '#8ED1FF', fontSize: 38, fontWeight: '800', lineHeight: 36 },
  testimonialText: { fontSize: 16, fontWeight: '700', lineHeight: 20, marginTop: 2 },
  testimonialFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  personName: { fontSize: 16, fontWeight: '800' },
  personRole: { fontSize: 14, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 2 },
  ctaButton: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 24, marginTop: 30 },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
