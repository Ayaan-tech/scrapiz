import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { CheckCircle2, Star } from 'lucide-react-native';
import { AuthService, OrderSummary, ProductSummary } from '../../../api/apiService';
import { useTheme } from '../../../context/ThemeContext';
import { useOrderTracking } from '../../../context/OrderTrackingContext';

interface ReceiptLineItem {
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export default function OrderCompleteScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { colors, isDark } = useTheme();
  const { acceptedVendor, completionSummary } = useOrderTracking();
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      try {
        const [orders, productCatalog] = await Promise.all([
          AuthService.getOrderNos(),
          AuthService.getProducts(),
        ]);

        if (!isMounted) {
          return;
        }

        const matched = orders.find((item) => item.id === Number(orderId)) || null;
        setOrder(matched);
        setProducts(productCatalog);
      } catch (error) {
        console.error('Unable to hydrate completed order summary', error);
      }
    };

    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const lineItems = useMemo<ReceiptLineItem[]>(() => {
    if (completionSummary?.line_items?.length) {
      return completionSummary.line_items.map((item) => ({
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
      }));
    }

    if (!order) {
      return [];
    }

    return order.orders.map((item) => {
      const product = products.find((entry) => entry.id === item.product.id);
      const quantity = Number(item.quantity || 0);
      const rate = product ? Math.round((product.min_rate + product.max_rate) / 2) : 0;
      return {
        label: item.product.name,
        quantity,
        unit: item.product.unit,
        rate,
        amount: Math.round(quantity * rate),
      };
    });
  }, [completionSummary?.line_items, order, products]);

  const totalPayout = useMemo(() => {
    if (completionSummary?.total_payout !== undefined && completionSummary.total_payout !== null) {
      return Number(completionSummary.total_payout);
    }

    if (order?.estimated_order_value) {
      return Number(order.estimated_order_value) + Number(order.redeemed_referral_bonus || 0);
    }

    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  }, [completionSummary?.total_payout, lineItems, order?.estimated_order_value, order?.redeemed_referral_bonus]);

  const submitRating = async (rating: number) => {
    setSelectedRating(rating);
    if (!acceptedVendor?.id) {
      return;
    }

    try {
      await AuthService.rateVendor(acceptedVendor.id, rating);
      setRatingSubmitted(true);
    } catch (error) {
      console.log('Vendor rating endpoint unavailable', error);
      setRatingSubmitted(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ConfettiCannon count={80} origin={{ x: 200, y: 0 }} fadeOut />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroIcon, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
          <CheckCircle2 size={54} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Pickup Complete!</Text>
        <Text style={[styles.amount, { color: colors.primary }]}>₹{Math.round(totalPayout)}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your payout has been confirmed and your order receipt is ready.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Receipt breakdown</Text>
          {lineItems.map((item) => (
            <View key={`${item.label}-${item.unit}`} style={styles.lineItemRow}>
              <View style={styles.lineItemLabelWrap}>
                <Text style={[styles.lineItemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.lineItemMeta, { color: colors.textSecondary }]}>
                  {item.quantity} {item.unit} x ₹{item.rate}
                </Text>
              </View>
              <Text style={[styles.lineItemAmount, { color: colors.text }]}>₹{item.amount}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Vendor</Text>
          <View style={styles.vendorRow}>
            <View style={[styles.vendorAvatar, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
              <Text style={[styles.vendorAvatarText, { color: colors.primary }]}>
                {acceptedVendor?.name?.slice(0, 1)?.toUpperCase() || 'V'}
              </Text>
            </View>
            <View style={styles.vendorMeta}>
              <Text style={[styles.vendorName, { color: colors.text }]}>{acceptedVendor?.name || 'Scrapiz partner'}</Text>
              <Text style={[styles.vendorSubtext, { color: colors.textSecondary }]}>
                {acceptedVendor?.vehicle_type || 'Pickup completed successfully'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Rate your vendor</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable key={rating} onPress={() => submitRating(rating)} style={styles.ratingButton}>
                <Star
                  size={28}
                  color={rating <= selectedRating ? '#f59e0b' : colors.border}
                  fill={rating <= selectedRating ? '#f59e0b' : 'transparent'}
                />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.ratingCaption, { color: colors.textSecondary }]}>
            {ratingSubmitted ? 'Thanks for your feedback.' : 'Tap a star to send a quick rating.'}
          </Text>
        </View>

        <View style={styles.actionStack}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/profile/orders/${orderId}` as any)}
          >
            <Text style={styles.primaryButtonText}>View Receipt</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.replace('/(tabs)/home' as any)}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  heroIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
  },
  amount: {
    textAlign: 'center',
    fontSize: 38,
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineItemLabelWrap: {
    flex: 1,
  },
  lineItemLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  lineItemMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  lineItemAmount: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vendorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  vendorMeta: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  vendorSubtext: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  ratingCaption: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  actionStack: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
