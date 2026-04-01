import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, MapPinned, PackageOpen, Phone, Truck } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../../context/ThemeContext';
import { useOrderTracking } from '../../../context/OrderTrackingContext';
import { OrderTrackingMap } from '../../../components/tracking/OrderTrackingMap';
import { formatTrackingDistance } from '../../../types/orderTracking';
import { DEFAULT_CENTER } from '../../../config/mapConfig';

const STEP_CONFIG = [
  { key: 'en_route', label: 'En route', icon: Truck },
  { key: 'arrived', label: 'Arrived', icon: MapPinned },
  { key: 'collecting', label: 'Collecting', icon: PackageOpen },
  { key: 'completed', label: 'Complete', icon: CheckCircle2 },
] as const;

function buildStatusCopy(name: string, step: string) {
  switch (step) {
    case 'arrived':
      return `${name} has arrived.`;
    case 'collecting':
      return `${name} is collecting your scrap.`;
    case 'ready':
      return `${name} is wrapping up your pickup.`;
    case 'completed':
      return 'Pickup completed successfully.';
    default:
      return `${name} is heading to you.`;
  }
}

export default function LiveTrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { colors, isDark } = useTheme();
  const {
    acceptedVendor,
    callVendor,
    connectionState,
    distanceKm,
    etaMinutes,
    pickup,
    step,
    vendorLocation,
    vendorPins,
  } = useOrderTracking();
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const requestedLocationRef = useRef(false);

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
          console.log('Network provider prompt unavailable', error);
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
        console.log('Live tracking location fallback unavailable', error);
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
  }, [pickup.lat, pickup.lng]);

  const currentStepIndex = useMemo(() => {
    const lookup = step === 'ready' ? 'collecting' : step;
    return Math.max(
      0,
      STEP_CONFIG.findIndex((item) => item.key === lookup)
    );
  }, [step]);

  const resolvedPickup = useMemo(() => {
    const isUsingDefaultPickup =
      pickup.lat === DEFAULT_CENTER[1] &&
      pickup.lng === DEFAULT_CENTER[0];

    if (isUsingDefaultPickup && deviceLocation) {
      return deviceLocation;
    }

    return pickup;
  }, [deviceLocation, pickup]);

  const resolvedVendorLocation = useMemo(() => {
    if (vendorLocation) {
      return vendorLocation;
    }

    if (acceptedVendor?.lat != null && acceptedVendor?.lng != null) {
      return {
        lat: acceptedVendor.lat,
        lng: acceptedVendor.lng,
      };
    }

    const firstVendorPin = vendorPins.find((pin) => pin.lat !== undefined && pin.lng !== undefined);
    if (firstVendorPin) {
      return {
        lat: firstVendorPin.lat,
        lng: firstVendorPin.lng,
      };
    }

    return null;
  }, [acceptedVendor?.lat, acceptedVendor?.lng, vendorLocation, vendorPins]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(`/tracking/${orderId}/search` as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.mapWrapper}>
        <OrderTrackingMap
          pickup={resolvedPickup}
          phase="en_route"
          vendorPins={vendorPins}
          acceptedVendorLocation={resolvedVendorLocation}
          userLocation={deviceLocation}
          distanceLabel={
            etaMinutes
              ? `${etaMinutes} min away • ${formatTrackingDistance(distanceKm)}`
              : formatTrackingDistance(distanceKm)
          }
        />

        <Pressable style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={handleGoBack}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>

        <View style={[styles.topStatusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.stepRail}>
            {STEP_CONFIG.map((item, index) => {
              const Icon = item.icon;
              const active = index <= currentStepIndex;
              return (
                <View key={item.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIcon,
                      {
                        backgroundColor: active ? colors.primary : isDark ? '#334155' : '#e2e8f0',
                      },
                    ]}
                  >
                    <Icon size={14} color={active ? '#fff' : colors.textSecondary} />
                  </View>
                  {index < STEP_CONFIG.length - 1 && (
                    <View
                      style={[
                        styles.stepConnector,
                        { backgroundColor: index < currentStepIndex ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
          <Text style={[styles.topStatusTitle, { color: colors.text }]}>
            {acceptedVendor ? buildStatusCopy(acceptedVendor.name, step) : 'Live vendor tracking'}
          </Text>
          <Text style={[styles.topStatusSubtitle, { color: colors.textSecondary }]}>
            {connectionState === 'connected' ? 'Connected to live location updates' : 'Using backup location sync'}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {step === 'arrived' && (
          <View style={[styles.arrivalBanner, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
            <Text style={[styles.arrivalBannerText, { color: colors.primary }]}>
              Your vendor has arrived. Please be ready.
            </Text>
          </View>
        )}

        <View style={styles.vendorHeader}>
          <View style={[styles.vendorAvatar, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
            <Text style={[styles.vendorAvatarText, { color: colors.primary }]}>
              {acceptedVendor?.name?.slice(0, 1)?.toUpperCase() || 'V'}
            </Text>
          </View>
          <View style={styles.vendorTextWrap}>
            <Text style={[styles.vendorName, { color: colors.text }]}>{acceptedVendor?.name || 'Pickup partner'}</Text>
            <Text style={[styles.vendorSubtitle, { color: colors.textSecondary }]}>
              {acceptedVendor?.vehicle_type || 'Assigned vendor'}
              {acceptedVendor?.vehicle_number ? ` • ${acceptedVendor.vehicle_number}` : ''}
            </Text>
          </View>
          <Pressable style={[styles.callButton, { backgroundColor: colors.primary }]} onPress={callVendor}>
            <Phone size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>ETA</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{etaMinutes ? `~${etaMinutes} mins` : 'Soon'}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{formatTrackingDistance(distanceKm)}</Text>
          </View>
        </View>

        <Text style={[styles.statusCopy, { color: colors.textSecondary }]}>
          {acceptedVendor ? buildStatusCopy(acceptedVendor.name.split(' ')[0], step) : 'Your pickup is active.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topStatusCard: {
    position: 'absolute',
    top: 18,
    left: 72,
    right: 18,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  stepRail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    marginHorizontal: 6,
  },
  topStatusTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  topStatusSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
  },
  arrivalBanner: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  arrivalBannerText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vendorAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  vendorTextWrap: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  vendorSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  metricValue: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  statusCopy: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
  },
});
