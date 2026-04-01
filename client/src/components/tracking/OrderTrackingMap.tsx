import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  AnimatedRegion,
  Circle,
  Marker,
  MarkerAnimated,
  Polyline,
  Region,
} from 'react-native-maps';
import MapboxGL from '@rnmapbox/maps';
import { Home, Truck } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { MAP_STYLES } from '../../config/mapConfig';
import { TrackingCoordinate, TrackingPhase, TrackingVendorPin } from '../../types/orderTracking';

interface OrderTrackingMapProps {
  pickup: TrackingCoordinate;
  phase: TrackingPhase;
  vendorPins: TrackingVendorPin[];
  acceptedVendorLocation: TrackingCoordinate | null;
  dispatchRadiusKm?: number;
  notifiedVendorCount?: number;
  distanceLabel?: string | null;
  userLocation?: TrackingCoordinate | null;
}

function buildRegion(pickup: TrackingCoordinate): Region {
  return {
    latitude: pickup.lat,
    longitude: pickup.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
}

function calculateBearing(from: TrackingCoordinate, to: TrackingCoordinate) {
  const startLat = (from.lat * Math.PI) / 180;
  const startLng = (from.lng * Math.PI) / 180;
  const endLat = (to.lat * Math.PI) / 180;
  const endLng = (to.lng * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function buildActiveVendor(
  acceptedVendorLocation: TrackingCoordinate | null,
  vendorPins: TrackingVendorPin[]
): TrackingCoordinate | null {
  if (acceptedVendorLocation) {
    return acceptedVendorLocation;
  }

  const firstPin = vendorPins.find((pin) => typeof pin.lat === 'number' && typeof pin.lng === 'number');
  return firstPin ? { lat: firstPin.lat, lng: firstPin.lng } : null;
}

function buildCurvedLineCoordinates(
  start: TrackingCoordinate,
  end: TrackingCoordinate
): [number, number][] {
  const midLng = (start.lng + end.lng) / 2;
  const midLat = (start.lat + end.lat) / 2;
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const offsetScale = Math.min(distance * 0.22, 0.015);
  const curveLng = midLng - (dy / distance) * offsetScale;
  const curveLat = midLat + (dx / distance) * offsetScale;

  return [
    [start.lng, start.lat],
    [curveLng, curveLat],
    [end.lng, end.lat],
  ];
}

function buildBounds(
  pickup: TrackingCoordinate,
  activeVendorLocation: TrackingCoordinate | null,
  userLocation: TrackingCoordinate | null
) {
  const points = [pickup, ...(activeVendorLocation ? [activeVendorLocation] : []), ...(userLocation ? [userLocation] : [])];
  if (points.length < 2) {
    return null;
  }

  const lngValues = points.map((point) => point.lng);
  const latValues = points.map((point) => point.lat);

  return {
    ne: [Math.max(...lngValues), Math.max(...latValues)] as [number, number],
    sw: [Math.min(...lngValues), Math.min(...latValues)] as [number, number],
  };
}

export function OrderTrackingMap({
  pickup,
  phase,
  vendorPins,
  acceptedVendorLocation,
  dispatchRadiusKm = 10,
  notifiedVendorCount = 0,
  distanceLabel,
  userLocation = null,
}: OrderTrackingMapProps) {
  const { colors, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.7)).current;
  const activeVendorLocation = useMemo(
    () => buildActiveVendor(acceptedVendorLocation, vendorPins),
    [acceptedVendorLocation, vendorPins]
  );
  const mapboxCurve = useMemo(
    () =>
      activeVendorLocation
        ? {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: buildCurvedLineCoordinates(activeVendorLocation, pickup),
            },
            properties: {},
          }
        : null,
    [activeVendorLocation, pickup]
  );
  const mapboxBounds = useMemo(
    () => buildBounds(pickup, activeVendorLocation, userLocation),
    [pickup, activeVendorLocation, userLocation]
  );
  const mapCameraKey = useMemo(() => {
    const parts = [
      pickup.lat.toFixed(6),
      pickup.lng.toFixed(6),
      activeVendorLocation?.lat?.toFixed(6) || 'no-vendor',
      activeVendorLocation?.lng?.toFixed(6) || 'no-vendor',
      userLocation?.lat?.toFixed(6) || 'no-user',
      userLocation?.lng?.toFixed(6) || 'no-user',
    ];
    return parts.join(':');
  }, [pickup, activeVendorLocation, userLocation]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (Platform.OS === 'android') {
    const passiveVendorPins = vendorPins.filter((pin) => {
      if (pin.lat === undefined || pin.lng === undefined) {
        return false;
      }

      if (!activeVendorLocation) {
        return true;
      }

      return (
        Math.abs(pin.lat - activeVendorLocation.lat) > 0.00001 ||
        Math.abs(pin.lng - activeVendorLocation.lng) > 0.00001
      );
    });

    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MAP_STYLES.hybrid}
          compassEnabled={false}
          scaleBarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera
            key={mapCameraKey}
            zoomLevel={activeVendorLocation ? 11.8 : 14.5}
            centerCoordinate={[
              (userLocation?.lng ?? pickup.lng),
              (userLocation?.lat ?? pickup.lat),
            ]}
            bounds={
              mapboxBounds
                ? {
                    ne: mapboxBounds.ne,
                    sw: mapboxBounds.sw,
                    paddingTop: 80,
                    paddingBottom: 180,
                    paddingLeft: 56,
                    paddingRight: 56,
                  }
                : undefined
            }
            animationMode="flyTo"
            animationDuration={1200}
          />

          <MapboxGL.UserLocation
            visible={!!userLocation}
            androidRenderMode="normal"
            showsUserHeadingIndicator={false}
          />

          {activeVendorLocation && mapboxCurve ? (
            <MapboxGL.ShapeSource id="tracking-route" shape={mapboxCurve as any}>
              <MapboxGL.LineLayer
                id="tracking-route-line"
                style={{
                  lineColor: colors.primary,
                  lineWidth: 3,
                  lineDasharray: [2, 2],
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.9,
                }}
              />
            </MapboxGL.ShapeSource>
          ) : null}

          <MapboxGL.PointAnnotation id="pickup-marker" coordinate={[pickup.lng, pickup.lat]}>
            <View style={styles.customerMarkerWrap}>
              <View style={[styles.customerMarker, { backgroundColor: colors.primary }]}>
                <Home size={18} color="#fff" />
              </View>
            </View>
          </MapboxGL.PointAnnotation>

          {userLocation ? (
            <MapboxGL.PointAnnotation
              id="user-location-marker"
              coordinate={[userLocation.lng, userLocation.lat]}
            >
              <View style={styles.userMarkerWrap}>
                <View style={styles.userMarkerPulse} />
                <View style={styles.userMarkerCore} />
              </View>
            </MapboxGL.PointAnnotation>
          ) : null}

          {activeVendorLocation ? (
            <MapboxGL.PointAnnotation
              id="active-vendor-marker"
              coordinate={[activeVendorLocation.lng, activeVendorLocation.lat]}
            >
              <View style={[styles.vendorMarker, styles.vendorMarkerActive]}>
                <Truck size={18} color="#fff" />
              </View>
            </MapboxGL.PointAnnotation>
          ) : null}

          {passiveVendorPins.map((vendor) => (
            <MapboxGL.PointAnnotation
              key={`vendor-pin-${vendor.vendor_id}`}
              id={`vendor-pin-${vendor.vendor_id}`}
              coordinate={[vendor.lng, vendor.lat]}
            >
              <View style={[styles.vendorMarker, styles.vendorMarkerMuted, { borderColor: colors.border }]}>
                <Truck size={16} color="#fff" />
              </View>
            </MapboxGL.PointAnnotation>
          ))}
        </MapboxGL.MapView>
      </View>
    );
  }

  const mapRef = useRef<MapView | null>(null);
  const animatedVendor = useRef(
    new AnimatedRegion({
      latitude: activeVendorLocation?.lat ?? pickup.lat,
      longitude: activeVendorLocation?.lng ?? pickup.lng,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;
  const previousVendorRef = useRef<TrackingCoordinate | null>(activeVendorLocation);
  const rotationRef = useRef(0);

  useEffect(() => {
    const points = [pickup, ...(activeVendorLocation ? [activeVendorLocation] : [])];
    if (!mapRef.current || !points.length) {
      return;
    }

    mapRef.current.fitToCoordinates(
      points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      {
        animated: true,
        edgePadding: { top: 80, right: 48, bottom: 220, left: 48 },
      }
    );
  }, [activeVendorLocation, pickup]);

  useEffect(() => {
    if (!activeVendorLocation) {
      return;
    }

    const previous = previousVendorRef.current;
    if (previous) {
      rotationRef.current = calculateBearing(previous, activeVendorLocation);
    }

    animatedVendor
      .timing({
        toValue: {
          latitude: activeVendorLocation.lat,
          longitude: activeVendorLocation.lng,
          latitudeDelta: 0,
          longitudeDelta: 0,
        },
        duration: 1000,
        useNativeDriver: false,
      } as any)
      .start();

    previousVendorRef.current = activeVendorLocation;
  }, [activeVendorLocation, animatedVendor]);

  const visibleVendorPins = useMemo(
    () => vendorPins.filter((pin) => pin.lat !== undefined && pin.lng !== undefined),
    [vendorPins]
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={buildRegion(pickup)}
        moveOnMarkerPress={false}
        rotateEnabled
        pitchEnabled={false}
        toolbarEnabled={false}
        mapPadding={{ top: 40, right: 0, bottom: Platform.OS === 'ios' ? 120 : 100, left: 0 }}
      >
        <Circle
          center={{ latitude: pickup.lat, longitude: pickup.lng }}
          radius={dispatchRadiusKm * 1000}
          strokeColor="rgba(22,163,74,0.32)"
          fillColor="rgba(22,163,74,0.08)"
          strokeWidth={1.5}
        />

        <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.customerMarkerWrap}>
            <Animated.View
              style={[
                styles.customerPulse,
                {
                  backgroundColor: 'rgba(22,163,74,0.18)',
                  transform: [{ scale: pulse }],
                },
              ]}
            />
            <View style={[styles.customerMarker, { backgroundColor: colors.primary }]}>
              <Home size={18} color="#fff" />
            </View>
          </View>
        </Marker>

        {userLocation ? (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerWrap}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerCore} />
            </View>
          </Marker>
        ) : null}

        {visibleVendorPins.map((vendor) => {
          const isActive =
            !!activeVendorLocation &&
            Math.abs(vendor.lat - activeVendorLocation.lat) < 0.00001 &&
            Math.abs(vendor.lng - activeVendorLocation.lng) < 0.00001;

          if (isActive && activeVendorLocation) {
            return null;
          }

          return (
            <Marker
              key={`pin-${vendor.vendor_id}`}
              coordinate={{ latitude: vendor.lat, longitude: vendor.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.vendorMarker, styles.vendorMarkerMuted, { borderColor: colors.border }]}>
                <Truck size={16} color={isDark ? '#e2e8f0' : '#64748b'} />
              </View>
            </Marker>
          );
        })}

        {activeVendorLocation && (
          <>
            <Polyline
              coordinates={[
                { latitude: activeVendorLocation.lat, longitude: activeVendorLocation.lng },
                {
                  latitude:
                    (activeVendorLocation.lat + pickup.lat) / 2 +
                    (pickup.lng - activeVendorLocation.lng) * 0.18,
                  longitude:
                    (activeVendorLocation.lng + pickup.lng) / 2 -
                    (pickup.lat - activeVendorLocation.lat) * 0.18,
                },
                { latitude: pickup.lat, longitude: pickup.lng },
              ]}
              strokeColor={colors.primary}
              strokeWidth={3}
              lineDashPattern={[10, 6]}
            />
            <MarkerAnimated coordinate={animatedVendor} anchor={{ x: 0.5, y: 0.5 }} flat>
              <View
                style={[
                  styles.vendorMarker,
                  styles.vendorMarkerActive,
                  { transform: [{ rotate: `${rotationRef.current}deg` }] },
                ]}
              >
                <Truck size={18} color="#fff" />
              </View>
            </MarkerAnimated>
          </>
        )}
      </MapView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customerMarkerWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerPulse: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  customerMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  vendorMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  vendorMarkerMuted: {
    backgroundColor: 'rgba(30,41,59,0.86)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  vendorMarkerActive: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#16a34a',
    borderColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  userMarkerWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  userMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
