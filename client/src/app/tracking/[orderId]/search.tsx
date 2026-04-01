import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock3, ShieldCheck, Star, Truck } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../../context/ThemeContext';
import { useOrderTracking } from '../../../context/OrderTrackingContext';
import {
  formatTrackingDistance,
  TrackingNearbyAgent,
  TrackingVendorPin,
} from '../../../types/orderTracking';
import { AuthService } from '../../../api/apiService';
import { OrderTrackingMap } from '../../../components/tracking/OrderTrackingMap';
import { DEFAULT_CENTER } from '../../../config/mapConfig';

function formatCountdown(expiresAt: string | null) {
  if (!expiresAt) {
    return 'Searching nearby agents';
  }

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatAvailability(value?: string | null) {
  if (!value) return 'Available';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderStars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={14}
          color={index < rounded ? '#F4B400' : '#D6DDE7'}
          fill={index < rounded ? '#F4B400' : 'transparent'}
        />
      ))}
    </View>
  );
}

function buildAgentPins(agents: TrackingNearbyAgent[]): TrackingVendorPin[] {
  return agents
    .filter((agent) => typeof agent.lat === 'number' && typeof agent.lng === 'number')
    .map((agent) => ({
      vendor_id: agent.id,
      name: agent.name,
      lat: agent.lat as number,
      lng: agent.lng as number,
      vehicle_type: agent.vehicle_type,
      vehicle_number: agent.vehicle_number,
      rating: agent.average_rating,
    }));
}

function FeaturedAgentCard({
  agent,
  countdown,
}: {
  agent: TrackingNearbyAgent;
  countdown: string;
}) {
  const rating = Number(agent.average_rating || 0);

  const metrics = [
    { label: 'Rating', value: rating > 0 ? rating.toFixed(1) : 'New' },
    { label: 'Availability', value: formatAvailability(agent.availability) },
    { label: 'Travel Window', value: countdown.includes(':') ? countdown : 'Live' },
    { label: 'Reviews', value: `${agent.rating_count || 0}` },
    { label: 'Vehicle', value: agent.vehicle_type || 'Assigned on dispatch' },
    { label: 'Agent ID', value: agent.agent_code || 'Pending' },
  ];

  return (
    <View style={styles.featuredCard}>
      <View style={styles.agentHeaderRow}>
        <View style={styles.agentIdentityRow}>
          {agent.profile_image_url ? (
            <Image source={{ uri: agent.profile_image_url }} style={styles.agentAvatarImage} />
          ) : (
            <View style={styles.agentAvatarFallback}>
              <Text style={styles.agentAvatarText}>{getInitials(agent.name)}</Text>
            </View>
          )}

          <View style={styles.agentIdentityCopy}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentRole}>Pickup Partner</Text>
          </View>
        </View>

        <View style={styles.vehicleBlock}>
          <Text style={styles.vehicleTitle} numberOfLines={1}>
            {agent.vehicle_type || 'Assigned on dispatch'}
          </Text>
          <Text style={styles.vehicleMeta} numberOfLines={1}>
            {agent.vehicle_number || 'Vehicle details shared after assignment'}
          </Text>
        </View>
      </View>

      <View style={styles.ratingHeaderRow}>
        <View style={styles.ratingWrap}>
          {renderStars(rating)}
          <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{formatAvailability(agent.availability)}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCell}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue} numberOfLines={2}>
              {metric.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Pickup update</Text>
        <Text style={styles.noteText}>
          Your pickup request has been shared with the nearest available partners. You will be notified as
          soon as one of them accepts the job, and you can safely return to the home screen in the meantime.
        </Text>
      </View>
    </View>
  );
}

function CompactAgentCard({ agent }: { agent: TrackingNearbyAgent }) {
  return (
    <View style={styles.compactCard}>
      {agent.profile_image_url ? (
        <Image source={{ uri: agent.profile_image_url }} style={styles.compactAvatarImage} />
      ) : (
        <View style={styles.compactAvatarFallback}>
          <Text style={styles.compactAvatarText}>{getInitials(agent.name)}</Text>
        </View>
      )}
      <View style={styles.compactCardCopy}>
        <Text style={styles.compactCardName} numberOfLines={1}>
          {agent.name}
        </Text>
        <Text style={styles.compactCardMeta} numberOfLines={1}>
          {agent.vehicle_type || 'Pickup partner'}
        </Text>
      </View>
      <View style={styles.compactRatingWrap}>
        <Star size={12} color="#F4B400" fill="#F4B400" />
        <Text style={styles.compactRatingText}>
          {Number(agent.average_rating || 0) > 0 ? Number(agent.average_rating).toFixed(1) : 'New'}
        </Text>
      </View>
    </View>
  );
}

export default function VendorSearchScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isDark } = useTheme();
  const {
    acceptedVendor,
    cancelOrder,
    distanceKm,
    etaMinutes,
    expiresAt,
    isBootstrapping,
    phase,
    pickup,
  } = useOrderTracking();

  const [nearbyAgents, setNearbyAgents] = useState<TrackingNearbyAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const requestedLocationRef = useRef(false);

  const countdown = useMemo(() => formatCountdown(expiresAt), [expiresAt]);

  useEffect(() => {
    if (!orderId || phase !== 'searching') {
      setIsLoadingAgents(false);
      return;
    }

    let isMounted = true;

    const loadAgents = async () => {
      try {
        setIsLoadingAgents(true);
        const data = await AuthService.getNearbyAgents(Number(orderId));
        if (isMounted) {
          setNearbyAgents(data);
        }
      } catch (error) {
        if (isMounted) {
          setNearbyAgents([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAgents(false);
        }
      }
    };

    loadAgents();
    const interval = setInterval(loadAgents, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId, phase]);

  useEffect(() => {
    let isMounted = true;

    const hydrateDeviceLocation = async () => {
      try {
        let status = (await Location.getForegroundPermissionsAsync()).status;
        if (status !== 'granted') {
          status = (await Location.requestForegroundPermissionsAsync()).status;
        }

        if (status !== 'granted') {
          return;
        }

        try {
          if (Location.enableNetworkProviderAsync) {
            await Location.enableNetworkProviderAsync();
          }
        } catch (error) {
          console.log('Search tracking network provider prompt unavailable', error);
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        });

        if (!isMounted) {
          return;
        }

        setDeviceLocation({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
      } catch (error) {
        console.log('Search tracking location unavailable', error);
      }
    };

    if (!requestedLocationRef.current) {
      requestedLocationRef.current = true;
      const timer = setTimeout(() => {
        hydrateDeviceLocation();
      }, 450);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const pickupCoordinate = useMemo(
    () => {
      const isUsingDefaultPickup =
        pickup.lat === DEFAULT_CENTER[1] &&
        pickup.lng === DEFAULT_CENTER[0];

      if (isUsingDefaultPickup && deviceLocation) {
        return deviceLocation;
      }

      return {
        lat: pickup.lat,
        lng: pickup.lng,
      };
    },
    [deviceLocation, pickup.lat, pickup.lng]
  );

  const searchablePins = useMemo(() => buildAgentPins(nearbyAgents), [nearbyAgents]);
  const activeSearchingAgent = nearbyAgents.find(
    (agent) => typeof agent.lat === 'number' && typeof agent.lng === 'number'
  );

  const activeVendorLocation = useMemo(() => {
    if (acceptedVendor?.lat != null && acceptedVendor?.lng != null) {
      return {
        lat: acceptedVendor.lat,
        lng: acceptedVendor.lng,
      };
    }

    if (activeSearchingAgent?.lat != null && activeSearchingAgent?.lng != null) {
      return {
        lat: activeSearchingAgent.lat,
        lng: activeSearchingAgent.lng,
      };
    }

    return null;
  }, [acceptedVendor?.lat, acceptedVendor?.lng, activeSearchingAgent?.lat, activeSearchingAgent?.lng]);

  const featuredAgent = useMemo(() => {
    if (phase === 'en_route' && acceptedVendor) {
      return {
        id: acceptedVendor.id,
        agent_code: `VEN-${acceptedVendor.id}`,
        name: acceptedVendor.name,
        phone: '',
        email: '',
        vehicle_number: acceptedVendor.vehicle_number,
        vehicle_type: acceptedVendor.vehicle_type,
        average_rating: acceptedVendor.rating,
        rating_count: null,
        availability: 'on_duty',
        lat: acceptedVendor.lat ?? null,
        lng: acceptedVendor.lng ?? null,
      } as TrackingNearbyAgent;
    }

    return nearbyAgents[0] ?? null;
  }, [acceptedVendor, nearbyAgents, phase]);

  const secondaryAgents = useMemo(
    () => nearbyAgents.filter((agent) => agent.id !== featuredAgent?.id).slice(0, 3),
    [featuredAgent?.id, nearbyAgents]
  );

  const distanceLabel = phase === 'en_route'
    ? `${etaMinutes ? `~${etaMinutes} mins` : 'On the way'} • ${formatTrackingDistance(distanceKm)}`
    : activeSearchingAgent
      ? 'Nearby partner mapped to your pickup'
      : null;

  const goHome = () => {
    router.replace('/(tabs)/home' as any);
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#1E8E3E" />
          <Text style={styles.loadingTitle}>Preparing your pickup map</Text>
          <Text style={styles.loadingSubtitle}>
            We are loading the latest order, partner, and location details for your request.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.mapStage}>
        <OrderTrackingMap
          pickup={pickupCoordinate}
          phase={phase}
          vendorPins={searchablePins}
          acceptedVendorLocation={activeVendorLocation}
          userLocation={deviceLocation}
          notifiedVendorCount={searchablePins.length}
          distanceLabel={distanceLabel}
        />

        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.liveChip}>
            <Clock3 size={14} color="#9AD7A8" />
            <Text style={styles.liveChipText}>
              {phase === 'en_route' ? 'Partner on the way' : countdown}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingAgents && !featuredAgent ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color="#1E8E3E" />
              <Text style={styles.inlineLoaderText}>Loading nearby pickup partners</Text>
            </View>
          ) : null}

          {featuredAgent ? (
            <FeaturedAgentCard agent={featuredAgent} countdown={countdown} />
          ) : (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIcon}>
                <Truck size={18} color="#1E8E3E" />
              </View>
              <Text style={styles.emptyStateTitle}>Searching nearby partners</Text>
              <Text style={styles.emptyStateText}>
                We are checking the closest active pickup partners for your request. You will be notified as
                soon as one of them accepts.
              </Text>
            </View>
          )}

          {secondaryAgents.length > 0 ? (
            <View style={styles.secondarySection}>
              <Text style={styles.secondarySectionTitle}>Other nearby partners</Text>
              {secondaryAgents.map((agent) => (
                <CompactAgentCard key={agent.id} agent={agent} />
              ))}
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={cancelOrder}>
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </Pressable>

            <Pressable style={styles.homeButton} onPress={goHome}>
              <ShieldCheck size={16} color="#FFFFFF" />
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    alignItems: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  mapStage: {
    height: '45%',
    backgroundColor: '#DCE9F5',
  },
  topBar: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.78)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  liveChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  sheet: {
    flex: 1,
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  inlineLoaderText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5EAF2',
    padding: 18,
  },
  agentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  agentIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  agentAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  agentAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E4F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E8E3E',
  },
  agentIdentityCopy: {
    flex: 1,
    minWidth: 0,
  },
  agentName: {
    fontSize: 19,
    lineHeight: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  agentRole: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  vehicleBlock: {
    alignItems: 'flex-end',
    maxWidth: '42%',
  },
  vehicleTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    textAlign: 'right',
  },
  vehicleMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'right',
  },
  ratingHeaderRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#EEF8F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E8E3E',
  },
  metricsGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  metricCell: {
    width: '33.33%',
    paddingRight: 10,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  noteCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5EAF2',
    padding: 16,
    backgroundColor: '#FBFCFE',
  },
  noteTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  emptyStateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4F5E8',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  secondarySection: {
    gap: 10,
  },
  secondarySectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  compactAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  compactAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: '#E4F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E8E3E',
  },
  compactCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactCardName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  compactCardMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  compactRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  compactRatingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  homeButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1E8E3E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  homeButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
