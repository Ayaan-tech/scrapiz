import React, { useMemo } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  Gift,
  Clock,
  CheckCircle,
  History,
  Zap,
  Sparkles,
  Target,
  Award,
  IndianRupee,
  ArrowUpRight,
  Info,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useReferral } from '../../context/ReferralContext';
import { useTheme } from '../../context/ThemeContext';
import { wp, hp, fs, spacing } from '../../utils/responsive';
import type { ReferralTransaction } from '../../types/referral';

const { width } = Dimensions.get('window');

export default function RewardsWalletScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  // Get data from ReferralContext
  const {
    referralBalance,
    pendingBalance,
    transactions,
    isLoading,
    isRefreshing,
    error,
    refreshReferralData,
    canRedeem,
  } = useReferral();

  // Calculate totals from transactions
  const { totalEarned, totalSpent } = useMemo(() => {
    const earned = transactions
      .filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const spent = Math.abs(
      transactions
        .filter(t => t.type === 'redeemed')
        .reduce((sum, t) => sum + t.amount, 0)
    );
    
    return { totalEarned: earned, totalSpent: spent };
  }, [transactions]);

  // Group transactions by date for timeline
  const groupedTransactions = useMemo(() => {
    const groups: { label: string; items: ReferralTransaction[] }[] = [];
    const map = new Map<string, ReferralTransaction[]>();

    for (const t of transactions) {
      const d = new Date(t.date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      let label: string;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';
      else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(t);
    }

    for (const [label, items] of map) {
      groups.push({ label, items });
    }
    return groups;
  }, [transactions]);

  const getTransactionIcon = (type: 'earned' | 'redeemed' | 'pending') => {
    switch (type) {
      case 'earned':
        return <Gift size={16} color="#16a34a" />;
      case 'redeemed':
        return <ArrowUpRight size={16} color="#6b7280" />;
      case 'pending':
        return <Clock size={16} color="#f59e0b" />;
      default:
        return <Coins size={16} color="#16a34a" />;
    }
  };

  const getDotColor = (type: 'earned' | 'redeemed' | 'pending') => {
    switch (type) {
      case 'earned': return '#16a34a';
      case 'redeemed': return '#6b7280';
      case 'pending': return '#f59e0b';
      default: return '#16a34a';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Loading state
  if (isLoading && transactions.length === 0) {
    return (
      <View className='flex-1 bg-gray-100'>
        <LinearGradient
          colors={['#16a34a', '#15803d', '#166534']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className='pt-14 px-5 pb-6'
        >
          <View className='flex-row items-center justify-between mb-6'>
            <TouchableOpacity
              className='w-10 h-10 rounded-full bg-white/25 items-center justify-center'
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text className='text-xl font-bold text-white tracking-wider'>Rewards Wallet</Text>
            <View className='w-10' />
          </View>
        </LinearGradient>
        
        <View className='flex-1 justify-center items-center px-5'>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className='text-base text-gray-600 mt-4 font-inter-medium'>Loading wallet data...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && transactions.length === 0) {
    return (
      <View className='flex-1 bg-gray-100'>
        <LinearGradient
          colors={['#16a34a', '#15803d', '#166534']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className='pt-14 px-5 pb-6'
        >
          <View className='flex-row items-center justify-between mb-6'>
            <TouchableOpacity
              className='w-10 h-10 rounded-full bg-white/25 items-center justify-center'
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text className='text-xl font-bold text-white tracking-wider'>Rewards Wallet</Text>
            <View className='w-10' />
          </View>
        </LinearGradient>
        
        <View className='flex-1 justify-center items-center px-5'>
          <AlertCircle size={64} color="#ef4444" />
          <Text className='text-xl font-bold text-gray-900 mt-4 font-inter-bold'>Oops! Something went wrong</Text>
          <Text className='text-base text-gray-600 mt-2 text-center font-inter-regular'>{error}</Text>
          <TouchableOpacity
            className='bg-green-600 rounded-xl py-4 px-8 mt-6'
            onPress={refreshReferralData}
            activeOpacity={0.8}
          >
            <Text className='text-base font-bold text-white font-inter-bold'>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Gradient */}
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#16a34a', '#15803d', '#166534']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards Wallet</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconBox}>
              <Coins size={28} color="#f59e0b" strokeWidth={2.5} />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>

          <View style={styles.balanceAmountRow}>
            <IndianRupee size={36} color="white" strokeWidth={3} />
            <Text style={styles.balanceAmount}>{referralBalance.toFixed(2)}</Text>
          </View>

          <Text style={styles.balanceSubtext}>
            💰 Extra earnings from referrals - withdraw anytime to your bank
          </Text>

          {/* Pending Badge */}
          {pendingBalance > 0 && (
            <View style={styles.pendingBadge}>
              <Clock size={14} color="white" />
              <Text style={styles.pendingText}>
                ₹{pendingBalance.toFixed(2)} pending verification
              </Text>
            </View>
          )}

          {/* Withdraw Button */}
          {canRedeem && (
            <TouchableOpacity
              style={styles.withdrawButton}
              activeOpacity={0.8}
              onPress={() => {
                // Withdraw functionality
                console.log('Withdraw to bank');
              }}
            >
              <IndianRupee size={18} color="white" strokeWidth={2.5} />
              <Text style={styles.withdrawButtonText}>Withdraw to Bank</Text>
            </TouchableOpacity>
          )}

          {!canRedeem && referralBalance === 0 && (
            <View style={styles.withdrawDisabled}>
              <Text style={styles.withdrawDisabledText}>
                Refer friends to start earning rewards!
              </Text>
            </View>
          )}
        </View>
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
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.primaryLight + '30' }]}>
              <TrendingUp size={20} color="#16a34a" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>₹{totalEarned}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Referrals Earned</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#f59e0b20' }]}>
              <Zap size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>₹{totalSpent}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Withdrawn</Text>
          </View>
        </View>

        {/* How It Works */}
       <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoIconBox, { backgroundColor: colors.primaryLight + '30' }]}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.text }]}>How Referral Wallet Works</Text>
          </View>

          <View style={styles.infoContent}>
            <View style={styles.infoPoint}>
              <View style={[styles.infoDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Text style={[styles.infoBold, { color: colors.text }]}>Refer a friend</Text> — you get ₹20, they get ₹10 instantly
              </Text>
            </View>

            <View style={styles.infoPoint}>
              <View style={[styles.infoDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Text style={[styles.infoBold, { color: colors.text }]}>Use on orders</Text> — auto-applied when order value exceeds ₹400
              </Text>
            </View>

            <View style={styles.infoPoint}>
              <View style={[styles.infoDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Text style={[styles.infoBold, { color: colors.text }]}>Withdraw anytime</Text> — transfer to bank when balance is available
              </Text>
            </View>
          </View>
        </View>

        {/* Earn More CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => router.push('/profile/refer-friends' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f59e0b', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaContent}>
              <View style={styles.ctaIconBox}>
                <Gift size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Invite Friends & Earn</Text>
                <Text style={styles.ctaSubtitle}>Get ₹20 per referral — they get ₹10</Text>
              </View>
            </View>
            <View style={styles.ctaArrow}>
              <ArrowUpRight size={24} color="white" strokeWidth={2.5} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Timeline Transaction History */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <View style={[styles.timelineHeaderIcon, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#ecfdf5' }]}>
              <History size={20} color="#16a34a" />
            </View>
            <Text style={[styles.timelineHeaderTitle, { color: colors.text }]}>Transaction History</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(156, 163, 175, 0.15)' : '#f3f4f6' }]}>
                <History size={32} color="#9ca3af" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Start referring friends to earn rewards and see your transaction history here!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/profile/refer-friends' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>Invite Friends Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {groupedTransactions.map((group, groupIndex) => (
                <View key={group.label} style={styles.timelineGroup}>
                  {/* Date Label */}
                  <View style={styles.timelineDateRow}>
                    <View style={[styles.timelineDateBadge, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#ecfdf5' }]}>
                      <Text style={[styles.timelineDateText, { color: colors.primary }]}>{group.label}</Text>
                    </View>
                  </View>

                  {/* Transactions */}
                  {group.items.map((transaction, itemIndex) => {
                    const isLast = groupIndex === groupedTransactions.length - 1 && itemIndex === group.items.length - 1;
                    const dotColor = getDotColor(transaction.type);

                    return (
                      <View key={transaction.id} style={styles.timelineItem}>
                        {/* Timeline Track */}
                        <View style={styles.timelineTrack}>
                          <View style={[styles.timelineDotOuter, { borderColor: dotColor }]}>
                            <View style={[styles.timelineDotInner, { backgroundColor: dotColor }]} />
                          </View>
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: isDark ? 'rgba(156, 163, 175, 0.25)' : '#e5e7eb' }]} />}
                        </View>

                        {/* Transaction Card */}
                        <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <View style={styles.timelineCardTop}>
                            <View style={[styles.timelineIconCircle, {
                              backgroundColor: transaction.type === 'earned' ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#ecfdf5') :
                                              transaction.type === 'pending' ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7') :
                                              (isDark ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6')
                            }]}>
                              {getTransactionIcon(transaction.type)}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.timelineCardTitle, { color: colors.text }]}>
                                {transaction.type === 'earned' ? 'Referral Bonus' : transaction.type === 'redeemed' ? 'Redeemed on Order' : 'Referral Pending'}
                              </Text>
                              <Text style={[styles.timelineCardDesc, { color: colors.textSecondary }]}>{transaction.description}</Text>
                            </View>
                            <View style={styles.timelineAmountBox}>
                              <Text style={[styles.timelineAmount, {
                                color: transaction.type === 'earned' ? '#16a34a' : transaction.type === 'pending' ? '#f59e0b' : '#6b7280'
                              }]}>
                                {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(0)}
                              </Text>
                              {transaction.type === 'pending' && (
                                <View style={[styles.pendingTag, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                                  <Text style={styles.pendingTagText}>Pending</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>{formatTime(transaction.date)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Tip */}
        <View style={[styles.bottomTip, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#ecfdf5', borderLeftColor: '#16a34a' }]}>
          <View style={[styles.bottomTipIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}>
            <Target size={18} color="#16a34a" />
          </View>
          <Text style={[styles.bottomTipText, { color: isDark ? '#86efac' : '#166534' }]}>
            <Text style={{ fontWeight: '600' }}>Remember:</Text> Your scrap selling payments go directly to your bank account. This wallet is only for referral bonuses!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Info card
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoContent: {
    gap: 12,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
  // CTA
  ctaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ctaIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  ctaArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Timeline
  timelineSection: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timelineHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  timelineGroup: {
    marginBottom: 8,
  },
  timelineDateRow: {
    marginBottom: 12,
    marginLeft: 10,
  },
  timelineDateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timelineDateText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineTrack: {
    width: 28,
    alignItems: 'center',
  },
  timelineDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 14,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    marginLeft: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  timelineCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  timelineCardDesc: {
    fontSize: 12,
  },
  timelineAmountBox: {
    alignItems: 'flex-end',
  },
  timelineAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  pendingTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  pendingTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  timelineTime: {
    fontSize: 11,
    marginTop: 8,
    marginLeft: 44,
  },
  // Empty
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  // Bottom tip
  bottomTip: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  bottomTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bottomTipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  // Header (gradient)
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  // Balance card
  balanceCard: {
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceIconBox: {
    marginRight: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: 'white',
    marginLeft: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  pendingText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  withdrawButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  withdrawDisabled: {
    marginTop: 4,
  },
  withdrawDisabledText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});
