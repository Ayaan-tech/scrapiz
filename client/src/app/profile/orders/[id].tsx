import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { ArrowLeft, MapPin, Calendar, Clock, Phone, IndianRupee, Package, CheckCircle, X, Hash, User, Star } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService, OrderSummary, ProductSummary, AddressSummary, RatingService } from '../../../api/apiService';
import { normalizeOrderStatus } from '../../../hooks/userOrderDetails';
import { useLocalization } from '../../../context/LocalizationContext';
import { RemoteImage } from '../../../components/RemoteImage';
import { useTheme } from '../../../context/ThemeContext';
import { OrderProgressTimeline } from '../../../components/OrderProgressTimeline';
import InlineStarRating from '../../../components/InlineStarRating';
import OrderRatingFeedbackModal from '../../../components/OrderRatingFeedbackModal';

function canTrackVendor(statusName: string) {
  return ['pending', 'scheduled', 'transit', 'en_route', 'arrived', 'in_progress', 'ready'].includes(
    (statusName || '').toLowerCase()
  );
}

export default function OrderDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useLocalization();
  const { colors, isDark } = useTheme();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [address, setAddress] = useState<AddressSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating state
  const [isRated, setIsRated] = useState<boolean | null>(null);
  const [agentName, setAgentName] = useState<string>('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);

  const orderId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (orderId) {
      loadDetails();
    } else {
      setError('Invalid order ID');
      setLoading(false);
    }
  }, [orderId]);

  /**
   * Check if the order has been rated
   * Per requirement 4.4: Show "Thanks for your feedback!" for rated orders
   */
  const checkRatingStatus = useCallback(async (orderIdNum: number, orderStatus: string) => {
    const statusName = normalizeOrderStatus(orderStatus);
    // Only check rating status for completed orders
    if (statusName !== 'completed') {
      setIsRated(null);
      return;
    }

    setRatingLoading(true);
    try {
      const ratingCheck = await RatingService.checkOrderRating(orderIdNum);
      setIsRated(ratingCheck.is_rated);
      setAgentName(ratingCheck.agent_name || '');
    } catch (error: any) {
      console.error('Error checking rating status:', error);
      // If we can't check, assume not rated to allow rating attempt
      setIsRated(false);
    } finally {
      setRatingLoading(false);
    }
  }, []);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersData, productsData, addressesData] = await Promise.all([
        AuthService.getOrderNos(),
        AuthService.getProducts(),
        AuthService.getAddresses(),
      ]);

      const foundOrder = ordersData.find(o => o.id.toString() === orderId);

      if (!foundOrder) {
        setError('Order not found');
        setLoading(false);
        return;
      }

      const orderAddress = addressesData.find(a => a.id === foundOrder.address) || null;
      const relatedProducts = productsData.filter(p =>
        foundOrder.orders.some(item => item.product.id === p.id)
      );

      setOrder(foundOrder);
      setProducts(relatedProducts);
      setAddress(orderAddress);

      // Check rating status for completed orders
      const statusName = normalizeOrderStatus(foundOrder.status);
      if (statusName === 'completed') {
        await checkRatingStatus(foundOrder.id, statusName);
      }
    } catch (error: any) {
      console.error('Error loading order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: any) => {
    const statusName = (typeof status === 'string' ? status : status?.name || '').toLowerCase();
    switch (statusName) {
      case 'pending': return '#f59e0b';
      case 'scheduled': return '#3b82f6';
      case 'transit': return '#8b5cf6';
      case 'completed': return '#16a34a';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: any): string => {
    const statusName = (typeof status === 'string' ? status : status?.name || '').toLowerCase();
    switch (statusName) {
      case 'pending': return 'Pending';
      case 'scheduled': return 'Scheduled';
      case 'transit': return 'In Transit';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getProductImage = (product: ProductSummary): { uri: string } | ImageSourcePropType => {
    if (product.image_url) {
      return { uri: product.image_url };
    }
    return getProductImageFallback(product.name);
  };

  const getProductImageFallback = (productName: string): ImageSourcePropType => {
    const name = productName.toLowerCase();
    if (name.includes('newspaper')) return require('../../../../assets/images/Scrap_Rates_Photos/Newspaper.jpg');
    if (name.includes('cardboard') || name.includes('corrugated')) return require('../../../../assets/images/Scrap_Rates_Photos/Cardboard.jpg');
    if (name.includes('book') || name.includes('paper')) return require('../../../../assets/images/Scrap_Rates_Photos/Book.jpg');
    if (name.includes('plastic')) return require('../../../../assets/images/Scrap_Rates_Photos/Plastics.jpg');
    if (name.includes('iron') || name.includes('steel')) return require('../../../../assets/images/Scrap_Rates_Photos/Iron.jpg');
    if (name.includes('aluminum') || name.includes('aluminium')) return require('../../../../assets/images/Scrap_Rates_Photos/Aluminium.jpg');
    if (name.includes('copper')) return require('../../../../assets/images/Scrap_Rates_Photos/Copper.jpg');
    if (name.includes('brass')) return require('../../../../assets/images/Scrap_Rates_Photos/Brass.jpg');
    if (name.includes('tin')) return require('../../../../assets/images/Scrap_Rates_Photos/Tin.jpg');
    if (name.includes('refrigerator')) return require('../../../../assets/images/Scrap_Rates_Photos/fridge.jpg');
    if (name.includes('battery')) return require('../../../../assets/images/Scrap_Rates_Photos/Battery.jpg');
    if (name.includes('front load machine')) return require('../../../../assets/images/Scrap_Rates_Photos/FrontLoadMachine.jpg');
    if (name.includes('tv') || name.includes('television')) return require('../../../../assets/images/Scrap_Rates_Photos/TV.jpg');
    if (name.includes('laptops')) return require('../../../../assets/images/Scrap_Rates_Photos/Laptops.jpg');
    if (name.includes('windowac')) return require('../../../../assets/images/Scrap_Rates_Photos/WindowAC.jpg');
    if (name.includes('printer')) return require('../../../../assets/images/Scrap_Rates_Photos/Printer.jpg');
    if (name.includes('microwave')) return require('../../../../assets/images/Scrap_Rates_Photos/Microwave.jpg');
    if (name.includes('glass')) return require('../../../../assets/images/Scrap_Rates_Photos/glass.jpg');
    return require('../../../../assets/images/Scrap_Rates_Photos/Book.jpg');
  };

  const totalAmount = useMemo(() => {
    if (!order || !products.length) return 0;
    if (order.estimated_order_value !== undefined && order.estimated_order_value !== null && order.estimated_order_value > 0) {
      return Number(order.estimated_order_value);
    }
    return order.orders.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product.id);
      const rate = product ? (product.max_rate + product.min_rate) / 2 : 0;
      const quantity = parseFloat(item.quantity) || 0;
      return sum + (rate * quantity);
    }, 0);
  }, [order, products]);

  const referralBonus = useMemo(() => {
    if (!order) return 0;
    return Number(order.redeemed_referral_bonus) || 0;
  }, [order]);

  const totalPayoutAmount = useMemo(() => {
    return totalAmount + referralBonus;
  }, [totalAmount, referralBonus]);

  const canCancelOrder = useMemo(() => {
    if (!order) return false;
    const statusName = (typeof order.status === 'string' ? order.status : order.status?.name || '').toLowerCase();
    const cancellableStatuses = ['pending', 'transit', 'scheduled'];
    return cancellableStatuses.includes(statusName) || statusName === '';
  }, [order]);

  const canTrackVendorForOrder = useMemo(() => {
    if (!order) return false;
    const statusName = (typeof order.status === 'string' ? order.status : order.status?.name || '').toLowerCase();
    return canTrackVendor(statusName);
  }, [order]);

  /**
   * Check if order is completed and eligible for rating
   * Per requirement 4.1: Display inline star rating for completed unrated orders
   */
  const isCompletedOrder = useMemo(() => {
    if (!order) return false;
    const statusName = (typeof order.status === 'string' ? order.status : order.status?.name || '').toLowerCase();
    return statusName === 'completed';
  }, [order]);

  /**
   * Handle star rating selection
   * Per requirement 4.3: Open feedback modal on star selection
   */
  const handleRatingSelect = useCallback((rating: number) => {
    setSelectedRating(rating);
    setShowFeedbackModal(true);
  }, []);

  /**
   * Handle successful rating submission
   * Per requirement 5.5: Refresh UI on success
   */
  const handleRatingSubmitSuccess = useCallback(() => {
    setIsRated(true);
    setShowFeedbackModal(false);
    setSelectedRating(0);
  }, []);

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.cancelOrder({ order_number: order?.order_number });
              Toast.show({
                type: 'success',
                text1: t('alerts.titles.success'),
                text2: t('toasts.success.orderCancelled'),
              });
              router.back();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: t('alerts.titles.error'),
                text2: error.message || t('toasts.error.cancelOrder'),
              });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusName = typeof order.status === 'string' ? order.status : order.status?.name || 'pending';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient feel */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>ORDER PROGRESS</Text>
          <View style={styles.orderIdRow}>
            <Hash size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.orderIdText}>{order.order_number}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Progress Timeline Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
          <OrderProgressTimeline 
            status={statusName} 
            orderDate={order.created_at}
            completedDate={statusName === 'completed' ? order.updated_at : undefined}
          />
          {canTrackVendorForOrder && (
            <TouchableOpacity
              style={[styles.trackVendorButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/tracking/${order.id}/search` as any)}
            >
              <Truck size={18} color="#fff" />
              <Text style={styles.trackVendorButtonText}>Would like to track your vendor?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rating Section - Per requirements 4.1, 4.3, 4.4 */}
        {isCompletedOrder && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('orderRating.feedbackTitle', { defaultValue: 'Your Feedback' })}
            </Text>
            
            {ratingLoading ? (
              <View style={styles.ratingLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : isRated ? (
              /* Per requirement 4.4: Show "Thanks for your feedback!" for rated orders */
              <View style={styles.ratedContainer}>
                <View style={[styles.ratedIconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7' }]}>
                  <CheckCircle size={24} color={colors.primary} />
                </View>
                <Text style={[styles.ratedText, { color: colors.text }]}>
                  {t('orderRating.thanksForFeedback', { defaultValue: 'Thanks for your feedback!' })}
                </Text>
                <Text style={[styles.ratedSubtext, { color: colors.textSecondary }]}>
                  {t('orderRating.feedbackHelps', { defaultValue: 'Your feedback helps us improve our service' })}
                </Text>
              </View>
            ) : (
              /* Per requirement 4.1: Display inline star rating for completed unrated orders */
              <View style={styles.unratedContainer}>
                <InlineStarRating
                  onRatingSelect={handleRatingSelect}
                  label={t('orderRating.rateYourExperience', { defaultValue: 'Rate your experience' })}
                />
                {agentName && (
                  <Text style={[styles.agentNameText, { color: colors.textSecondary }]}>
                    {t('orderRating.withAgent', { defaultValue: 'with {{agentName}}', agentName })}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Order Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Order Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#dcfce7' }]}>
                <Calendar size={18} color="#16a34a" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Order Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(order.created_at)}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Clock size={18} color="#3b82f6" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Order Time</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formatTime(order.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Items ({order.orders.length})</Text>
          {order.orders.map((item, index) => {
            const product = products.find((p) => p.id === item.product.id);
            const rate = product ? (product.max_rate + product.min_rate) / 2 : 0;
            const quantity = parseFloat(item.quantity) || 0;
            const itemTotal = rate * quantity;

            return (
              <View key={index} style={[styles.itemRow, index !== order.orders.length - 1 && styles.itemRowBorder, { borderBottomColor: colors.border }]}>
                <RemoteImage
                  source={getProductImage(item.product)}
                  fallback={getProductImageFallback(item.product.name)}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.product.name}</Text>
                  <Text style={[styles.itemRate, { color: colors.textSecondary }]}>
                    ₹{Math.round(rate)}/{item.product.unit}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemQuantity, { color: colors.textSecondary }]}>
                    {quantity} {item.product.unit}
                  </Text>
                  <Text style={[styles.itemTotal, { color: colors.primary }]}>₹{Math.round(itemTotal)}</Text>
                </View>
              </View>
            );
          })}
          
          {/* Totals */}
          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Estimated Value</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            {referralBonus > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.bonusLabel, { color: colors.primary }]}>Referral Bonus</Text>
                <Text style={[styles.bonusValue, { color: colors.primary }]}>+₹{referralBonus.toFixed(2)}</Text>
              </View>
            )}
            {referralBonus > 0 && (
              <View style={[styles.finalTotalRow, { borderTopColor: colors.primary }]}>
                <Text style={[styles.finalTotalLabel, { color: colors.text }]}>Total Payout</Text>
                <Text style={[styles.finalTotalValue, { color: colors.primary }]}>₹{totalPayoutAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Address Card */}
        {address && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Pickup Address</Text>
            <View style={styles.addressContent}>
              <View style={[styles.addressIconContainer, { backgroundColor: '#fef3c7' }]}>
                <MapPin size={20} color="#f59e0b" />
              </View>
              <View style={styles.addressTextContainer}>
                <Text style={[styles.addressName, { color: colors.text }]}>{address.name}</Text>
                <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                  {address.room_number}, {address.street}, {address.area}
                </Text>
                <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>
                <View style={styles.phoneRow}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={[styles.phoneText, { color: colors.text }]}>{address.phone_number}</Text>
                </View>
              </View>
            </View>
            {address.delivery_suggestion && (
              <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#fef9f0', borderColor: '#fbbf24' }]}>
                <Text style={[styles.noteText, { color: colors.text }]}>
                  Note: {address.delivery_suggestion}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Cancel Button */}
        {canCancelOrder && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: '#dc2626' }]}
            onPress={handleCancelOrder}
          >
            <X size={20} color="#dc2626" />
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Order Rating Feedback Modal - Per requirements 5.1, 5.2, 5.3, 5.5 */}
      {order && (
        <OrderRatingFeedbackModal
          visible={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedRating(0);
          }}
          orderId={order.id}
          agentName={agentName}
          rating={selectedRating}
          onSubmitSuccess={handleRatingSubmitSuccess}
        />
      )}

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#fff',
    letterSpacing: 1,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  itemRate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
  totalSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  bonusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  bonusValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  addressContent: {
    flexDirection: 'row',
  },
  addressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  noteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  trackVendorButton: {
    marginTop: 16,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackVendorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#dc2626',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  // Rating section styles
  ratingLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  ratedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ratedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratedText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  ratedSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  unratedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  agentNameText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});
