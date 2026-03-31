import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { fs, spacing } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing(36);

interface ServiceCardProps {
  title: string;
  accentColor: string;
  image: ImageSourcePropType;
  included: string[];
  onLearnMore?: () => void;
  onBookNow?: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, amount = 45): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  accentColor,
  image,
  included,
  onLearnMore,
  onBookNow,
}) => {
  const { isDark } = useTheme();

  // Colors
  const accent = isDark ? lightenColor(accentColor) : accentColor;
  const cardBg = isDark ? '#1a2332' : '#ffffff';
  const borderColor = isDark
    ? hexToRgba(accentColor, 0.5)
    : accentColor;
  const includedBg = isDark ? hexToRgba(accentColor, 0.08) : '#f9fafb';
  const includedBorder = isDark ? hexToRgba(accentColor, 0.25) : '#e5e7eb';
  const titleColor = accent;
  const headingColor = isDark ? '#e2e8f0' : '#1f2937';
  const bulletColor = isDark ? '#94a3b8' : '#4b5563';
  const btnOutlineBorder = isDark ? hexToRgba(accentColor, 0.5) : accentColor;
  const btnOutlineText = accent;
  const btnFillBg = accent;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
          shadowColor: isDark ? '#000' : accentColor,
        },
      ]}
    >
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        <Image source={image} style={styles.image} resizeMode="cover" />
      </View>

      {/* ── Title ── */}
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
        {title}
      </Text>

      {/* ── What's Included ── */}
      <View style={[styles.includedBox, { backgroundColor: includedBg, borderColor: includedBorder }]}>
        <Text style={[styles.includedHeading, { color: headingColor }]}>
          What's Included?
        </Text>
        {included.map((item, index) => (
          <View key={index} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: accent }]} />
            <Text style={[styles.bulletText, { color: bulletColor }]}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: btnOutlineBorder }]}
          activeOpacity={0.7}
          onPress={onLearnMore}
        >
          <Text style={[styles.btnOutlineText, { color: btnOutlineText }]}>
            Learn more
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnFill, { backgroundColor: btnFillBg }]}
          activeOpacity={0.8}
          onPress={onBookNow}
        >
          <Text style={styles.btnFillText}>Book now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    marginBottom: spacing(20),
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  // Image
  imageWrap: {
    marginHorizontal: spacing(12),
    marginTop: spacing(12),
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 170,
  },

  // Title
  title: {
    fontSize: fs(20),
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    paddingHorizontal: spacing(14),
    paddingTop: spacing(14),
    paddingBottom: spacing(10),
  },

  // Included box
  includedBox: {
    marginHorizontal: spacing(12),
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing(14),
    paddingTop: spacing(12),
    paddingBottom: spacing(10),
    marginBottom: spacing(14),
  },
  includedHeading: {
    fontSize: fs(14),
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    marginBottom: spacing(8),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(5),
    gap: spacing(8),
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: spacing(5),
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: fs(12.5),
    fontFamily: 'Inter-Regular',
    lineHeight: fs(18),
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: spacing(10),
    paddingHorizontal: spacing(12),
    paddingBottom: spacing(14),
  },
  btnOutline: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: fs(13),
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  btnFill: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFillText: {
    color: '#fff',
    fontSize: fs(13),
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
});

export default ServiceCard;
