import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Gift, Users, IndianRupee, Share2, Copy, Wallet, CheckCircle, Info, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useReferral } from '../../context/ReferralContext';
import { useTheme } from '../../context/ThemeContext';
import { wp, hp, fs, spacing } from '../../utils/responsive';

// Loading Skeleton Components
const ReferralCodeSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={styles.codeLeft}>
        <View style={[styles.skeleton, { width: 40, height: 12, marginBottom: 8 }]} />
        <View style={[styles.skeleton, { width: 120, height: 24 }]} />
      </View>
      <View style={[styles.skeleton, { width: 60, height: 36, borderRadius: 10 }]} />
    </View>
  );
};

const StatsCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.skeleton, { width: 40, height: 40, borderRadius: 20, marginBottom: 10 }]} />
      <View style={[styles.skeleton, { width: 30, height: 22, marginBottom: 4 }]} />
      <View style={[styles.skeleton, { width: 60, height: 11 }]} />
    </View>
  );
};

// Error Screen Component
const ErrorScreen = ({ error, onRetry }: { error: string; onRetry: () => void }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={48} color="#ef4444" />
      <Text style={[styles.errorTitle, { color: colors.text }]}>Oops! Something went wrong</Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ReferFriendsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { 
    referralCode,
    referralBalance,
    pendingBalance, 
    totalReferrals, 
    successfulReferrals,
    isLoading,
    isRefreshing,
    error,
    refreshReferralData,
    shareMessage,
    canRedeem,
    hasUsedReferralCode,
    applyReferralCode,
  } = useReferral();
  
  const [friendCode, setFriendCode] = useState('');
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  
  const referralLink = referralCode ? `https://scrapiz.in/ref/${referralCode}` : '';

  // Re-fetch fresh balance every time the screen is focused so rewards
  // credited just before navigation (e.g. after applying a referral code)
  // are immediately visible.
  useFocusEffect(
    useCallback(() => {
      refreshReferralData();
    }, [])
  );

  const handleApplyFriendCode = async () => {
    const code = friendCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Error', 'Please enter a referral code.');
      return;
    }
    setIsApplyingCode(true);
    try {
      await applyReferralCode(code);
      setFriendCode('');
      Alert.alert('🎉 Bonus Applied!', 'You\'ve received ₹10 in your referral wallet!');
    } catch (err: any) {
      Alert.alert('Invalid Code', err.message || 'The referral code could not be applied. Please check and try again.');
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleShare = async () => {
    if (!shareMessage || !referralCode) {
      Alert.alert('Error', 'Referral code not available. Please try again.');
      return;
    }
    
    try {
      await Share.share({
        message: shareMessage,
        title: 'Earn with Scrapiz - Sell Scrap, Earn Money!',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyCode = () => {
    if (!referralCode) {
      Alert.alert('Error', 'Referral code not available. Please try again.');
      return;
    }
    
    Clipboard.setString(referralCode);
    Alert.alert('✅ Copied!', 'Referral code copied to clipboard', [{ text: 'OK' }]);
  };

  const handleCopyLink = () => {
    if (!referralLink) {
      Alert.alert('Error', 'Referral link not available. Please try again.');
      return;
    }
    
    Clipboard.setString(referralLink);
    Alert.alert('✅ Copied!', 'Referral link copied to clipboard', [{ text: 'OK' }]);
  };

  const handleWhatsAppShare = async () => {
    if (!shareMessage || !referralCode) {
      Alert.alert('Error', 'Referral code not available. Please try again.');
      return;
    }
    
    try {
      const encodedMessage = encodeURIComponent(shareMessage);
      const whatsappURL = `whatsapp://send?text=${encodedMessage}`;
      const canOpen = await Linking.canOpenURL(whatsappURL);
      
      if (canOpen) {
        await Linking.openURL(whatsappURL);
      } else {
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp is not installed on your device. Would you like to share via other apps?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Share via Other Apps', 
              onPress: handleShare 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Error',
        'Could not open WhatsApp. Please try sharing via other apps.',
        [
          { text: 'OK' },
          { text: 'Share via Other Apps', onPress: handleShare }
        ]
      );
    }
  };

  // Show loading state
  if (isLoading && !referralCode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#16a34a', '#15803d', '#166534']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading referral data...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error && !referralCode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#16a34a', '#15803d', '#166534']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        
        <ErrorScreen error={error} onRetry={refreshReferralData} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <LinearGradient
        colors={['#16a34a', '#15803d', '#166534']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshReferralData}
            tintColor="#16a34a"
            colors={['#16a34a']}
          />
        }
      >
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <LinearGradient
            colors={['#16a34a', '#15803d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.walletGradient}
          >
            <View style={styles.walletHeader}>
              <View style={styles.walletIcon}>
                <Wallet size={24} color="white" />
              </View>
              <Text style={styles.walletTitle}>Referral Wallet</Text>
            </View>
            
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={styles.balanceAmount}>
                  <IndianRupee size={28} color="white" strokeWidth={3} />
                  <Text style={styles.balanceValue}>
                    {referralBalance.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.balanceSubtext}>
                  {canRedeem 
                    ? 'Usable on orders above ₹400' 
                    : 'Refer friends to start earning!'}
                </Text>
              </View>
            </View>

            <View style={styles.pendingSection}>
              <View style={styles.pendingRow}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingText}>Pending: ₹{pendingBalance.toFixed(2)}</Text>
              </View>
              <Text style={styles.pendingSubtext}>Credits instantly on sign-up</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {isLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight + '30' }]}>
                  <Users size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalReferrals}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Referrals</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight + '30' }]}>
                  <CheckCircle size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{successfulReferrals}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Successful</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight + '30' }]}>
                  <IndianRupee size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>₹20</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Per Referral</Text>
              </View>
            </>
          )}
        </View>

        {/* Have a Friend's Code? — shown only until the user applies one */}
        {!hasUsedReferralCode && (
          <View style={[styles.friendCodeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.sectionHeader}>
              <Gift size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Have a Friend's Code?</Text>
            </View>
            <Text style={[styles.friendCodeSubtitle, { color: colors.textSecondary }]}>
              Enter your friend's referral code to get ₹10 instantly in your referral wallet!
            </Text>
            <View style={styles.friendCodeInputRow}>
              <TextInput
                style={[styles.friendCodeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. ABCD-1234"
                placeholderTextColor={colors.textSecondary}
                value={friendCode}
                onChangeText={setFriendCode}
                autoCapitalize="characters"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.friendCodeButton, { backgroundColor: colors.primary, opacity: isApplyingCode ? 0.7 : 1 }]}
                onPress={handleApplyFriendCode}
                disabled={isApplyingCode}
                activeOpacity={0.8}
              >
                {isApplyingCode
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={styles.friendCodeButtonText}>Apply</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={[styles.howItWorksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Gift size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How It Works</Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumberWrapper}>
                <View style={[styles.stepNumberBox, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Share Your Code</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Share your unique referral code with friends & family via WhatsApp, SMS or social media
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberWrapper}>
                <View style={[styles.stepNumberBox, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Friend Signs Up</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Your friend signs up using your referral code
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberWrapper}>
                <View style={[styles.stepNumberBox, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Both Earn Rewards!</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  You get ₹20 instantly • Your friend gets ₹10 on sign-up
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <Text style={[styles.codeSectionTitle, { color: colors.text }]}>Your Referral Code</Text>
          
          {isLoading ? (
            <ReferralCodeSkeleton />
          ) : (
            <>
              <TouchableOpacity style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={handleCopyCode} activeOpacity={0.7}>
                <View style={styles.codeLeft}>
                  <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>CODE</Text>
                  <Text style={[styles.codeText, { color: colors.text }]}>{referralCode || 'Loading...'}</Text>
                </View>
                <View style={[styles.copyIconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
                  <Copy size={20} color={colors.primary} />
                  <Text style={[styles.copyText, { color: colors.primary }]}>Copy</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Share Button */}
        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.shareButtonFull} onPress={handleShare} activeOpacity={0.8}>
            <LinearGradient
              colors={['#16a34a', '#15803d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradientFull}
            >
              <Share2 size={20} color="white" />
              <Text style={styles.shareButtonText}>Share Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Benefits Section */}
        <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Text style={styles.benefitEmoji}>💰</Text>
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>Smart Savings</Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                Your ₹20 earnings are auto-applied when order value exceeds ₹400 — no manual redemption needed!
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Text style={styles.benefitEmoji}>♻️</Text>
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>Win-Win-Win</Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                You earn • Friend saves • Environment benefits from more recycling!
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Text style={styles.benefitEmoji}>🎯</Text>
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>No Limits</Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                Refer unlimited friends and keep earning ₹20 per successful referral
              </Text>
            </View>
          </View>
        </View>

        {/* Important Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight + '20', borderColor: colors.primaryLight }]}>
          <View style={styles.infoHeader}>
            <Info size={18} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>Important Points</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              ✓ Friend must use your code during signup{'\n'}
              ✓ You earn ₹20, friend gets ₹10 instantly on sign-up{'\n'}
              ✓ Order value must exceed ₹400 to redeem{'\n'}
              ✓ Balance auto-applies on eligible orders{'\n'}
              ✓ Valid for genuine referrals only
            </Text>
          </View>
        </View>

        {/* Footer Note */}
        <View style={[styles.footerNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            🌱 As a bootstrapped startup, we're building Scrapiz sustainably. Every referral helps us grow while keeping our service cost-effective for you!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Wallet Card
  walletCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  walletGradient: {
    padding: 24,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  balanceRow: {
    marginBottom: 16,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '800',
    color: 'white',
    fontFamily: 'Inter-Bold',
    marginLeft: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: 'Inter-Regular',
  },
  pendingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
    marginRight: 8,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  pendingSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Regular',
    marginLeft: 14,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },

  // Friend's Code card
  friendCodeCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  friendCodeSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 14,
    lineHeight: 19,
  },
  friendCodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendCodeInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1,
  },
  friendCodeButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  friendCodeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },

  // How It Works
  howItWorksCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginLeft: 10,
  },
  stepsContainer: {
    paddingLeft: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberWrapper: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    marginTop: 8,
    marginBottom: 8,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },

  // Code Section
  codeSection: {
    marginBottom: 20,
  },
  codeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  codeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  codeLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16a34a',
    fontFamily: 'Inter-Bold',
    letterSpacing: 2,
  },
  copyIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
  },
  linkCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    flex: 1,
    marginRight: 12,
  },

  // Share Section
  shareSection: {
    marginBottom: 24,
  },
  shareButtonFull: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    height: 52,
  },
  shareGradientFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    height: '100%',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },

  // Benefits
  benefitsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitEmoji: {
    fontSize: 24,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  infoContent: {
    paddingLeft: 0,
  },
  infoText: {
    fontSize: 13,
    color: '#166534',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },

  // Footer
  footerNote: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    textAlign: 'center',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
  },
  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
});
