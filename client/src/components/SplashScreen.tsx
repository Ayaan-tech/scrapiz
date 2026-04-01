import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

const BRAND_GREEN = '#1E8E3E';
const INITIAL_DELAY_MS = 200;
const INTRO_DURATION_MS = 400;
const ZOOM_DURATION_MS = 600;
const HOLD_DURATION_MS = 400;
const REVEAL_DURATION_MS = 400;

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandScale = useRef(new Animated.Value(0.9)).current;
  const hasFinished = useRef(false);

  useEffect(() => {
    const introAnimation = Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: INTRO_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(brandScale, {
        toValue: 1,
        duration: INTRO_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const zoomAnimation = Animated.timing(brandScale, {
      toValue: 7,
      duration: ZOOM_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    const holdAnimation = Animated.timing(brandScale, {
      toValue: 7.4,
      duration: HOLD_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });

    const revealAnimation = Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: REVEAL_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });

    const sequence = Animated.sequence([
      Animated.delay(INITIAL_DELAY_MS),
      introAnimation,
      zoomAnimation,
      holdAnimation,
      revealAnimation,
    ]);

    sequence.start(({ finished }) => {
      if (finished && !hasFinished.current) {
        hasFinished.current = true;
        onFinish();
      }
    });

    return () => {
      sequence.stop();
    };
  }, [brandOpacity, brandScale, onFinish, overlayOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: overlayOpacity }]}>
        <View style={styles.brandLockup}>
          <Animated.View
            style={[
              styles.brandStage,
              {
                opacity: brandOpacity,
                transform: [{ scale: brandScale }],
              },
            ]}
          >
            <Image
              source={require('../../assets/images/splashScreenLogo.png')}
              style={styles.logo}
              resizeMode="contain"
              fadeDuration={0}
            />
            <Text style={styles.brandText}>Scrapiz</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_GREEN,
    position: 'absolute',
    zIndex: 10,
  },
  brandLockup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandStage: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    position: 'absolute',
    width: 148,
    height: 148,
    opacity: 0,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2.2,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'LeagueSpartan-Bold',
  },
});
